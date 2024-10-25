const express = require('express');
const router = express.Router();
const pool = require('./pool');
const bodyParser = require('body-parser');

router.post('/', bodyParser.json(), async (req, res) => {
  const sessionId = req.header('Session-ID');
  const emailHeader = req.header('Email');

  // Validate required headers
  if (!sessionId || !emailHeader) {
    return res
      .status(400)
      .json({ message: 'Session ID and Email headers are required!' });
  }

  const { userData, data, deletedRows } = req.body;
  const { username, orgID, email, roleID, userId } = userData;

  // Validate email header matches user data
  if (email !== emailHeader) {
    return res.status(401).json({
      message: 'Unauthorized: Email header does not match user data!',
    });
  }

  // Validate data format
  if (!Array.isArray(data) || !data.every((item) => typeof item === 'object')) {
    return res
      .status(400)
      .json({ message: 'Invalid JSON body format for new data' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Check organization permissions
    const [orgResult] = await connection.query(
      'SELECT org_name FROM organization WHERE org_ID = ?',
      [orgID]
    );

    // Validate organization access for non-admin users
    if (roleID !== '1') {
      const hasUnauthorizedData = data.some(
        (item) =>
          item.CompanyName.toLowerCase().replace(/\s/g, '') !==
          orgResult[0].org_name.toLowerCase().trim().replace(/\s/g, '')
      );

      if (hasUnauthorizedData) {
        return res.status(403).json({
          message: "You don't have permission to upload from this Organization",
        });
      }
    }

    // Helper function to check if objects are different
    const objectsAreDifferent = (obj1, obj2, excludeKeys) => {
      const keys1 = Object.keys(obj1).filter(
        (key) => !excludeKeys.includes(key)
      );
      const keys2 = Object.keys(obj2).filter(
        (key) => !excludeKeys.includes(key)
      );

      if (keys1.length !== keys2.length) return true;

      for (let key of keys1) {
        if (obj1[key] !== obj2[key]) {
          return true;
        }
      }
      return false;
    };

    const excludeColumns = [
      'ID',
      'Org_ID',
      'UserName',
      'MonthYear',
      'CompanyName',
    ];

    for (const newData of data) {
      const existingRow = await getExistingRow(connection, newData.CompanyName, newData.MonthYear);

      if (existingRow) {
        if (objectsAreDifferent(existingRow, newData, excludeColumns)) {
          await updatePortfolioFormat(connection, newData, existingRow.ID);
          await logAuditAction(connection, newData, orgID, userId, 'Overridden');
        }
      } else {
        await insertPortfolioFormat(connection, newData, orgID, username);
        await logAuditAction(connection, newData, orgID, userId, 'Insert');
      }

      await updateMetricsForRow(connection, newData, orgID, username);
    }

    // Handle deleted rows
    if (deletedRows && Array.isArray(deletedRows) && deletedRows.length > 0) {
      for (const deletedRow of deletedRows) {
        await deletePortfolioFormat(connection, deletedRow.ID);
        await deleteMetricsForRow(connection, deletedRow, orgID);
        await logAuditAction(connection, deletedRow, orgID, userId, 'Delete');
      }
    }

    await connection.commit();
    res.status(200).json({ message: 'Data uploaded and metrics updated successfully' });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    
    // Enhanced error handling
    if (error instanceof TypeError) {
      console.error('Type Error occurred:', error.message);
      res.status(500).json({ message: 'Invalid Data.' });
    } else if (error instanceof ReferenceError) {
      console.error('Reference Error occurred:', error.message);
      res.status(500).json({ message: 'Something went wrong. Try Upload later' });
    } else {
      console.error('An unexpected error occurred:', error.message);
      res.status(500).json({ message: 'Something went wrong. Try Upload later' });
    }
  } finally {
    if (connection) connection.release();
  }
});

async function getExistingRow(connection, companyName, monthYear) {
  const [rows] = await connection.query(
    'SELECT * FROM portfolio_companies_format WHERE CompanyName = ? AND MonthYear = ?',
    [companyName, monthYear]
  );
  return rows[0];
}


async function updatePortfolioFormat(connection, data, id) {
  const query = `
    UPDATE portfolio_companies_format SET
    RevenueActual = ?, RevenueBudget = ?, GrossProfitActual = ?, GrossProfitBudget = ?,
    SGAActual = ?, SGABudget = ?, EBITDAActual = ?, EBITDABudget = ?,
    CapExActual = ?, CapExBudget = ?, FixedAssetsNetActual = ?, FixedAssetsNetBudget = ?,
    CashActual = ?, CashBudget = ?, TotalDebtActual = ?, TotalDebtBudget = ?,
    AccountsReceivableActual = ?, AccountsReceivableBudget = ?,
    AccountsPayableActual = ?, AccountsPayableBudget = ?,
    InventoryActual = ?, InventoryBudget = ?,
    EmployeesActual = ?, EmployeesBudget = ?
    WHERE ID = ?
  `;
  const values = [
    data.RevenueActual, data.RevenueBudget, data.GrossProfitActual, data.GrossProfitBudget,
    data.SGAActual, data.SGABudget, data.EBITDAActual, data.EBITDABudget,
    data.CapExActual, data.CapExBudget, data.FixedAssetsNetActual, data.FixedAssetsNetBudget,
    data.CashActual, data.CashBudget, data.TotalDebtActual, data.TotalDebtBudget,
    data.AccountsReceivableActual, data.AccountsReceivableBudget,
    data.AccountsPayableActual, data.AccountsPayableBudget,
    data.InventoryActual, data.InventoryBudget,
    data.EmployeesActual, data.EmployeesBudget, id
  ];
  await connection.query(query, values);

  // After updating portfolio_companies_format, update the metrics
  await updateMetricsForRow(connection, data, data.Org_ID, data.UserName);
}

async function insertPortfolioFormat(connection, data, orgID, username) {
  const query = `
    INSERT INTO portfolio_companies_format
    (Org_ID, UserName, MonthYear, CompanyName, RevenueActual, RevenueBudget,
    GrossProfitActual, GrossProfitBudget, SGAActual, SGABudget,
    EBITDAActual, EBITDABudget, CapExActual, CapExBudget,
    FixedAssetsNetActual, FixedAssetsNetBudget, CashActual, CashBudget,
    TotalDebtActual, TotalDebtBudget, AccountsReceivableActual, AccountsReceivableBudget,
    AccountsPayableActual, AccountsPayableBudget, InventoryActual, InventoryBudget,
    EmployeesActual, EmployeesBudget)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    orgID, username, data.MonthYear, data.CompanyName, data.RevenueActual, data.RevenueBudget,
    data.GrossProfitActual, data.GrossProfitBudget, data.SGAActual, data.SGABudget,
    data.EBITDAActual, data.EBITDABudget, data.CapExActual, data.CapExBudget,
    data.FixedAssetsNetActual, data.FixedAssetsNetBudget, data.CashActual, data.CashBudget,
    data.TotalDebtActual, data.TotalDebtBudget, data.AccountsReceivableActual, data.AccountsReceivableBudget,
    data.AccountsPayableActual, data.AccountsPayableBudget, data.InventoryActual, data.InventoryBudget,
    data.EmployeesActual, data.EmployeesBudget
  ];
  await connection.query(query, values);

  // After inserting into portfolio_companies_format, update the metrics
  await updateMetricsForRow(connection, { ...data, Org_ID: orgID, UserName: username }, orgID, username);
}

async function updateMetricsForRow(connection, data, orgID, username) {
  try {
    // Delete existing metrics for this row before inserting new ones
    await deleteMetricsForRow(connection, data, orgID);

    // Update Actual metrics
    await updateMetrics(connection, data, orgID, username, 1, 'Actual');

    // Update Budget metrics
    await updateMetrics(connection, data, orgID, username, 2, 'Budget');

    // Get and update Prior metrics
    const priorData = await getPreviousMonthData(connection, data.CompanyName, data.MonthYear);
    
    // console.log('Prior data for metrics update:', {
    //   exists: !!priorData,
    //   monthYear: priorData?.MonthYear,
    //   revenueActual: priorData?.RevenueActual
    // });

    if (priorData && Object.keys(priorData).length > 0) {
      // Ensure the MonthYear is preserved from the prior data
      await updateMetrics(connection, {
        ...priorData,
        MonthYear: data.MonthYear  // Use current month for the metrics record
      }, orgID, username, 3, 'Prior');
    } else {
      console.log(`No prior data found for ${data.CompanyName} on ${data.MonthYear}`);
      const zeroPriorData = {
        ...data,
        RevenueActual: 0,
        GrossProfitActual: 0,
        SGAActual: 0,
        EBITDAActual: 0,
        CashActual: 0,
        AccountsReceivableActual: 0,
        InventoryActual: 0,
        FixedAssetsNetActual: 0,
        AccountsPayableActual: 0,
        TotalDebtActual: 0,
        CapExActual: 0,
        EmployeesActual: 0,
        MonthYear: data.MonthYear
      };
      await updateMetrics(connection, zeroPriorData, orgID, username, 3, 'Prior');
    }

    // Calculate and update variances
    await calculateAndUpdateVariances(connection, data, priorData, orgID, username);
  } catch (error) {
    console.error('Error in updateMetricsForRow:', error);
    throw error;
  }
}

async function calculateAndUpdateVariances(connection, data, priorData, orgID, username) {
  // Variance Actual (Actual - Prior)
  const varianceActualData = calculateVariance(data, priorData || data, 'Actual', 'Actual');
  await updateMetrics(connection, varianceActualData, orgID, username, 4, 'VarianceActual');

  // Variance Budget (Actual - Budget)
  const varianceBudgetData = calculateVariance(data, data, 'Actual', 'Budget');
  await updateMetrics(connection, varianceBudgetData, orgID, username, 5, 'VarianceBudget');
}


async function deleteMetricsForRow(connection, data, orgID) {
  const query = `
    DELETE FROM portfolio_companies_metrics
    WHERE Org_ID = ? AND MonthYear = ? AND CompanyName = ?
  `;

  const values = [
    orgID,
    data.MonthYear,
    data.CompanyName
  ];

  await connection.query(query, values);
}


async function updateMetrics(connection, data, orgID, username, operatingResultID, operatingResultName) {
  // // Debug log the incoming data
  // console.log('Updating metrics with data:', {
  //   operatingResultName,
  //   data: {
  //     MonthYear: data.MonthYear,
  //     CompanyName: data.CompanyName,
  //     Revenue: data.RevenueActual, // Note what we're logging
  //   }
  // });

  const query = `
    INSERT INTO portfolio_companies_metrics (
      Org_ID, UserName, MonthYear, CompanyName, OperatingResultID, OperatingResultName,
      Revenue, GrossProfit, GrossMargin, SGAExpense, SGAPercentOfRevenue,
      EBITDAM, EBITDAMPercentOfRevenue, Cash, AccountsReceivable, Inventory,
      FixedAssetsNet, AccountsPayable, TotalDebt, NetDebt, CapEx, Employees, Quarter
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // For Prior data, we need to use the Actual values directly
  let revenue, grossProfit, sga, ebitda, cash, accountsReceivable, 
      inventory, fixedAssetsNet, accountsPayable, totalDebt, capEx, employees;

  if (operatingResultName === 'Prior') {
    // When handling Prior data, use the Actual values directly
    revenue = parseFloat(data.RevenueActual) || 0;
    grossProfit = parseFloat(data.GrossProfitActual) || 0;
    sga = parseFloat(data.SGAActual) || 0;
    ebitda = parseFloat(data.EBITDAActual) || 0;
    cash = parseFloat(data.CashActual) || 0;
    accountsReceivable = parseFloat(data.AccountsReceivableActual) || 0;
    inventory = parseFloat(data.InventoryActual) || 0;
    fixedAssetsNet = parseFloat(data.FixedAssetsNetActual) || 0;
    accountsPayable = parseFloat(data.AccountsPayableActual) || 0;
    totalDebt = parseFloat(data.TotalDebtActual) || 0;
    capEx = parseFloat(data.CapExActual) || 0;
    employees = parseFloat(data.EmployeesActual) || 0;
  } else {
    // For other types, keep the existing logic
    const suffix = operatingResultName.includes('Variance') ? '' : operatingResultName;
    revenue = parseFloat(data[`Revenue${suffix}`]) || 0;
    grossProfit = parseFloat(data[`GrossProfit${suffix}`]) || 0;
    sga = parseFloat(data[`SGA${suffix}`]) || 0;
    ebitda = parseFloat(data[`EBITDA${suffix}`]) || 0;
    cash = parseFloat(data[`Cash${suffix}`]) || 0;
    accountsReceivable = parseFloat(data[`AccountsReceivable${suffix}`]) || 0;
    inventory = parseFloat(data[`Inventory${suffix}`]) || 0;
    fixedAssetsNet = parseFloat(data[`FixedAssetsNet${suffix}`]) || 0;
    accountsPayable = parseFloat(data[`AccountsPayable${suffix}`]) || 0;
    totalDebt = parseFloat(data[`TotalDebt${suffix}`]) || 0;
    capEx = parseFloat(data[`CapEx${suffix}`]) || 0;
    employees = parseFloat(data[`Employees${suffix}`]) || 0;
  }

  // Calculate ratios
  const grossMargin = revenue !== 0 ? (grossProfit / revenue) : 0;
  const sgaPercentOfRevenue = revenue !== 0 ? (sga / revenue) : 0;
  const ebitdaPercentOfRevenue = revenue !== 0 ? (ebitda / revenue) : 0;
  const netDebt = totalDebt - cash;


  const values = [
    orgID,
    username,
    data.MonthYear,
    data.CompanyName,
    operatingResultID,
    operatingResultName,
    revenue,
    grossProfit,
    grossMargin,
    sga,
    sgaPercentOfRevenue,
    ebitda,
    ebitdaPercentOfRevenue,
    cash,
    accountsReceivable,
    inventory,
    fixedAssetsNet,
    accountsPayable,
    totalDebt,
    netDebt,
    capEx,
    employees,
    `Q${Math.floor(new Date(data.MonthYear).getMonth() / 3) + 1}`
  ];

  try {
    await connection.query(query, values);
    // console.log(`Successfully updated ${operatingResultName} metrics for ${data.CompanyName}`);
  } catch (error) {
    // console.error(`Error updating ${operatingResultName} metrics:`, error);
    throw error;
  }
}

function calculateVariance(actualData, compareData, actualType, compareType) {
  const varianceData = { ...actualData };
  const fields = [
    'Revenue', 'GrossProfit', 'SGA', 'EBITDA', 'Cash', 'AccountsReceivable',
    'Inventory', 'FixedAssetsNet', 'AccountsPayable', 'TotalDebt', 'CapEx', 'Employees'
  ];

  fields.forEach(field => {
    const actualValue = parseFloat(actualData[`${field}${actualType}`]) || 0;
    const compareValue = parseFloat(compareData[`${field}${compareType}`]) || 0;
    varianceData[`${field}`] = actualValue - compareValue;
  });

  return varianceData;
}

async function getPreviousMonthData(connection, companyName, currentMonthYear) {
  try {

    const [rows] = await connection.query(`
      SELECT * FROM portfolio_companies_format
      WHERE CompanyName = ? AND MonthYear < ?
      ORDER BY MonthYear DESC
      LIMIT 1
    `, [companyName, currentMonthYear]);

    if (rows[0]) {
      const priorData = {
        MonthYear: rows[0].MonthYear,
        CompanyName: rows[0].CompanyName,
        RevenueActual: rows[0].RevenueActual || 0,
        GrossProfitActual: rows[0].GrossProfitActual || 0,
        SGAActual: rows[0].SGAActual || 0,
        EBITDAActual: rows[0].EBITDAActual || 0,
        CashActual: rows[0].CashActual || 0,
        AccountsReceivableActual: rows[0].AccountsReceivableActual || 0,
        InventoryActual: rows[0].InventoryActual || 0,
        FixedAssetsNetActual: rows[0].FixedAssetsNetActual || 0,
        AccountsPayableActual: rows[0].AccountsPayableActual || 0,
        TotalDebtActual: rows[0].TotalDebtActual || 0,
        CapExActual: rows[0].CapExActual || 0,
        EmployeesActual: rows[0].EmployeesActual || 0
      };

      // Log the constructed prior data
      // console.log('Constructed prior data:', priorData);
      return priorData;
    }

    console.log('No prior data found');
    return null;
  } catch (error) {
    console.error('Error getting prior data:', error);
    throw error;
  }
}

async function logAuditAction(connection, data, orgID, userId, action) {
  const query = `
    INSERT INTO portfolio_audit 
    (Org_Id, ModifiedBy, UserAction, MonthYear, CompanyName, 
    RevenueActual, RevenueBudget, GrossProfitActual, GrossProfitBudget,
    SGAActual, SGABudget, EBITDAActual, EBITDABudget, CapExActual, CapExBudget,
    FixedAssetsNetActual, FixedAssetsNetBudget, CashActual, CashBudget,
    TotalDebtActual, TotalDebtBudget, AccountsReceivableActual, AccountsReceivableBudget,
    AccountsPayableActual, AccountsPayableBudget, InventoryActual, InventoryBudget,
    EmployeesActual, EmployeesBudget)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    orgID, userId, action, data.MonthYear, data.CompanyName,
    data.RevenueActual, data.RevenueBudget, data.GrossProfitActual, data.GrossProfitBudget,
    data.SGAActual, data.SGABudget, data.EBITDAActual, data.EBITDABudget, data.CapExActual, data.CapExBudget,
    data.FixedAssetsNetActual, data.FixedAssetsNetBudget, data.CashActual, data.CashBudget,
    data.TotalDebtActual, data.TotalDebtBudget, data.AccountsReceivableActual, data.AccountsReceivableBudget,
    data.AccountsPayableActual, data.AccountsPayableBudget, data.InventoryActual, data.InventoryBudget,
    data.EmployeesActual, data.EmployeesBudget
  ];

  await connection.query(query, values);
}

module.exports = router;
