const express = require('express');
const router = express.Router();
const pool = require('./pool');
const bodyParser = require('body-parser');
const metrics = require('./metrics-calculations');
router.post('/', bodyParser.json(), async (req, res) => {
  const sessionId = req.header('Session-ID');
  const emailHeader = req.header('Email');

  // Validate required headers
  if (!sessionId || !emailHeader) {
    return res
      .status(400)
      .json({ message: 'Session ID and Email headers are required!' });
  }

  const { userData, data } = req.body;
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
      const existingRow = await getExistingRow(
        connection,
        newData.CompanyName,
        newData.MonthYear
      );

      if (existingRow) {
        if (objectsAreDifferent(existingRow, newData, excludeColumns)) {
          await updatePortfolioFormat(
            connection,
            newData,
            existingRow.ID,
            orgID,
            username,
            userId
          );
          await logAuditAction(
            connection,
            newData,
            orgID,
            userId,
            'Overridden'
          );
        }
      } else {
        await insertPortfolioFormat(
          connection,
          newData,
          orgID,
          username,
          userId
        );
        await logAuditAction(connection, newData, orgID, userId, 'Insert');
      }

      // await updateMetricsForRow(connection, newData, orgID, username);
    }

    await connection.commit();
    res
      .status(200)
      .json({ message: 'Data uploaded and metrics updated successfully' });
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
      res
        .status(500)
        .json({ message: 'Something went wrong. Try Upload later' });
    } else {
      console.error('An unexpected error occurred:', error.message);
      res
        .status(500)
        .json({ message: 'Something went wrong. Try Upload later' });
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

async function updatePortfolioFormat(
  connection,
  data,
  id,
  orgID,
  username,
  userId
) {
  const query = `
    UPDATE portfolio_companies_format SET
    RevenueActual = ?, RevenueBudget = ?, GrossProfitActual = ?, GrossProfitBudget = ?,
    SGAActual = ?, SGABudget = ?, EBITDAActual = ?, EBITDABudget = ?,
    CapExActual = ?, CapExBudget = ?, FixedAssetsNetActual = ?, FixedAssetsNetBudget = ?,
    CashActual = ?, CashBudget = ?, TotalDebtActual = ?, TotalDebtBudget = ?,
    AccountsReceivableActual = ?, AccountsReceivableBudget = ?,
    AccountsPayableActual = ?, AccountsPayableBudget = ?,
    InventoryActual = ?, InventoryBudget = ?,
    EmployeesActual = ?, EmployeesBudget = ?, updatedBy =? 
    WHERE ID = ?
  `;
  const values = [
    data.RevenueActual,
    data.RevenueBudget,
    data.GrossProfitActual,
    data.GrossProfitBudget,
    data.SGAActual,
    data.SGABudget,
    data.EBITDAActual,
    data.EBITDABudget,
    data.CapExActual,
    data.CapExBudget,
    data.FixedAssetsNetActual,
    data.FixedAssetsNetBudget,
    data.CashActual,
    data.CashBudget,
    data.TotalDebtActual,
    data.TotalDebtBudget,
    data.AccountsReceivableActual,
    data.AccountsReceivableBudget,
    data.AccountsPayableActual,
    data.AccountsPayableBudget,
    data.InventoryActual,
    data.InventoryBudget,
    data.EmployeesActual,
    data.EmployeesBudget,
    userId,
    id,
  ];
  await connection.query(query, values);

  // After updating portfolio_companies_format, update the metrics
  await metrics.updateMetricsForRow(
    connection,
    { ...data, Org_ID: orgID, UserName: username },
    orgID,
    username
  );
}

async function insertPortfolioFormat(
  connection,
  data,
  orgID,
  username,
  userId
) {
  const query = `
    INSERT INTO portfolio_companies_format
    (Org_ID, UserName, MonthYear, CompanyName, RevenueActual, RevenueBudget,
    GrossProfitActual, GrossProfitBudget, SGAActual, SGABudget,
    EBITDAActual, EBITDABudget, CapExActual, CapExBudget,
    FixedAssetsNetActual, FixedAssetsNetBudget, CashActual, CashBudget,
    TotalDebtActual, TotalDebtBudget, AccountsReceivableActual, AccountsReceivableBudget,
    AccountsPayableActual, AccountsPayableBudget, InventoryActual, InventoryBudget,
    EmployeesActual, EmployeesBudget,createdBy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
  `;
  const values = [
    orgID,
    username,
    data.MonthYear,
    data.CompanyName,
    data.RevenueActual,
    data.RevenueBudget,
    data.GrossProfitActual,
    data.GrossProfitBudget,
    data.SGAActual,
    data.SGABudget,
    data.EBITDAActual,
    data.EBITDABudget,
    data.CapExActual,
    data.CapExBudget,
    data.FixedAssetsNetActual,
    data.FixedAssetsNetBudget,
    data.CashActual,
    data.CashBudget,
    data.TotalDebtActual,
    data.TotalDebtBudget,
    data.AccountsReceivableActual,
    data.AccountsReceivableBudget,
    data.AccountsPayableActual,
    data.AccountsPayableBudget,
    data.InventoryActual,
    data.InventoryBudget,
    data.EmployeesActual,
    data.EmployeesBudget,
    userId,
  ];
  await connection.query(query, values);

  // After inserting into portfolio_companies_format, update the metrics
  await metrics.updateMetricsForRow(
    connection,
    { ...data, Org_ID: orgID, UserName: username },
    orgID,
    username
  );
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
    orgID,
    userId,
    action,
    data.MonthYear,
    data.CompanyName,
    data.RevenueActual,
    data.RevenueBudget,
    data.GrossProfitActual,
    data.GrossProfitBudget,
    data.SGAActual,
    data.SGABudget,
    data.EBITDAActual,
    data.EBITDABudget,
    data.CapExActual,
    data.CapExBudget,
    data.FixedAssetsNetActual,
    data.FixedAssetsNetBudget,
    data.CashActual,
    data.CashBudget,
    data.TotalDebtActual,
    data.TotalDebtBudget,
    data.AccountsReceivableActual,
    data.AccountsReceivableBudget,
    data.AccountsPayableActual,
    data.AccountsPayableBudget,
    data.InventoryActual,
    data.InventoryBudget,
    data.EmployeesActual,
    data.EmployeesBudget,
  ];

  await connection.query(query, values);
}

module.exports = router;
