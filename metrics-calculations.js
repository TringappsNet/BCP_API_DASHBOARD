module.exports = {
  updateMetricsForRow,
  calculateAndUpdateVariances,
  getPreviousYearData,
  deleteMetricsForRow,
  updateMetrics,
  calculateVariance,
};
async function updateMetricsForRow(connection, data, orgID, username) {
  try {
    // Delete existing metrics for this row before inserting new ones
    await deleteMetricsForRow(connection, data, orgID);

    // Update Actual metrics
    await updateMetrics(connection, data, orgID, username, 1, 'Actual');

    // Update Budget metrics
    await updateMetrics(connection, data, orgID, username, 2, 'Budget');

    // Get and update Prior metrics
    const priorData = await getPreviousYearData(
      connection,
      data.CompanyName,
      data.MonthYear
    );

    // console.log('Prior data for metrics update:', {
    //   exists: !!priorData,
    //   monthYear: priorData?.MonthYear,
    //   revenueActual: priorData?.RevenueActual
    // });
    if (priorData && Object.keys(priorData).length > 0) {
      // Ensure the MonthYear is preserved from the prior data
      await updateMetrics(
        connection,
        {
          ...priorData,
          MonthYear: data.MonthYear, // Use current month for the metrics record
        },
        orgID,
        username,
        3,
        'Prior'
      );
    } else {
      console.log(
        `No prior data found for ${data.CompanyName} on ${data.MonthYear}`
      );
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
        MonthYear: data.MonthYear,
      };
      console.log('priordata', priorData, data.MonthYear);

      await updateMetrics(
        connection,
        zeroPriorData,
        orgID,
        username,
        3,
        'Prior'
      );
    }

    // Calculate and update variances
    await calculateAndUpdateVariances(
      connection,
      data,
      priorData,
      orgID,
      username
    );
  } catch (error) {
    console.error('Error in updateMetricsForRow:', error);
    throw error;
  }
}

async function calculateAndUpdateVariances(
  connection,
  data,
  priorData,
  orgID,
  username
) {
  // Variance Actual (Actual - Prior)
  const varianceActualData = calculateVariance(
    data,
    priorData,
    'Actual',
    'Actual'
  );
  await updateMetrics(
    connection,
    varianceActualData,
    orgID,
    username,
    4,
    'VarianceActual'
  );

  // Variance Budget (Actual - Budget)
  const varianceBudgetData = calculateVariance(data, data, 'Actual', 'Budget');
  await updateMetrics(
    connection,
    varianceBudgetData,
    orgID,
    username,
    5,
    'VarianceBudget'
  );
}

async function deleteMetricsForRow(connection, data, orgID) {
  const query = `
      DELETE FROM portfolio_companies_metrics
      WHERE MonthYear = ? AND CompanyName = ?
    `;

  const values = [data.MonthYear, data.CompanyName];
  await connection.query(query, values);
}

async function updateMetrics(
  connection,
  data,
  orgID,
  username,
  operatingResultID,
  operatingResultName
) {
  const query = `
      INSERT INTO portfolio_companies_metrics (
        Org_ID, UserName, MonthYear, CompanyName, OperatingResultID, OperatingResultName,
        Revenue, GrossProfit, GrossMargin, SGAExpense, SGAPercentOfRevenue,
        EBITDAM, EBITDAMPercentOfRevenue, Cash, AccountsReceivable, Inventory,
        FixedAssetsNet, AccountsPayable, TotalDebt, NetDebt, CapEx, Employees, Quarter
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

  // Determine suffix or direct use of Actual values
  const isPrior = operatingResultName === 'Prior';
  const isVariance = operatingResultName.startsWith('Variance');
  const suffix = isPrior ? 'Actual' : isVariance ? '' : operatingResultName;

  // Extract values based on conditions
  const revenue = parseFloat(data[`Revenue${suffix}`]) || 0;
  const grossProfit = parseFloat(data[`GrossProfit${suffix}`]) || 0;
  const sga = parseFloat(data[`SGA${suffix}`]) || 0;
  const ebitda = parseFloat(data[`EBITDA${suffix}`]) || 0;
  const cash = parseFloat(data[`Cash${suffix}`]) || 0;
  const accountsReceivable =
    parseFloat(data[`AccountsReceivable${suffix}`]) || 0;
  const inventory = parseFloat(data[`Inventory${suffix}`]) || 0;
  const fixedAssetsNet = parseFloat(data[`FixedAssetsNet${suffix}`]) || 0;
  const accountsPayable = parseFloat(data[`AccountsPayable${suffix}`]) || 0;
  const totalDebt = parseFloat(data[`TotalDebt${suffix}`]) || 0;
  const capEx = parseFloat(data[`CapEx${suffix}`]) || 0;
  const employees = parseFloat(data[`Employees${suffix}`]) || 0;

  // Read or calculate metrics based on isVariance
  const grossMargin = isVariance
    ? parseFloat(data.GrossMargin) || 0
    : revenue !== 0
    ? (grossProfit / revenue) * 100
    : 0;
  const sgaPercentOfRevenue = isVariance
    ? parseFloat(data.sgaPercentOfRevenue) || 0
    : revenue !== 0
    ? (sga / revenue) * 100
    : 0;
  const ebitdaPercentOfRevenue = isVariance
    ? parseFloat(data.ebitdaPercentOfRevenue) || 0
    : revenue !== 0
    ? (ebitda / revenue) * 100
    : 0;
  const netDebt = isVariance ? parseFloat(data.NetDebt) || 0 : totalDebt - cash;

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
    `Q${Math.floor(new Date(data.MonthYear).getMonth() / 3) + 1}`,
  ];

  try {
    await connection.query(query, values);
  } catch (error) {
    throw error;
  }
}

function calculateVariance(actualData, compareData, actualType, compareType) {
  const fields = [
    'Revenue',
    'GrossProfit',
    'SGA',
    'EBITDA',
    'Cash',
    'AccountsReceivable',
    'Inventory',
    'FixedAssetsNet',
    'AccountsPayable',
    'TotalDebt',
    'CapEx',
    'Employees',
  ];

  // Helper function to safely parse values or return 0
  const safeParse = (data, field) => parseFloat(data[field]) || 0;

  // If compareData is null, return actual values with calculated fields
  if (!compareData) {
    return {
      ...actualData,
      ...Object.fromEntries(
        fields.map((field) => [field, actualData[`${field}Actual`]])
      ),
      GrossMargin: safeParse(actualData, 'RevenueActual')
        ? (safeParse(actualData, 'GrossProfitActual') /
            safeParse(actualData, 'RevenueActual')) *
          100
        : 0,
      sgaPercentOfRevenue: safeParse(actualData, 'RevenueActual')
        ? (safeParse(actualData, 'SGAActual') /
            safeParse(actualData, 'RevenueActual')) *
          100
        : 0,
      ebitdaPercentOfRevenue: safeParse(actualData, 'RevenueActual')
        ? (safeParse(actualData, 'EBITDAActual') /
            safeParse(actualData, 'RevenueActual')) *
          100
        : 0,
      NetDebt:
        safeParse(actualData, 'TotalDebtActual') -
        safeParse(actualData, 'CashActual'),
    };
  }

  // Calculate variance data
  const varianceData = { ...actualData };
  fields.forEach((field) => {
    const actualValue = safeParse(actualData, `${field}${actualType}`);
    const compareValue = safeParse(compareData, `${field}${compareType}`);
    varianceData[field] = actualValue - compareValue;
  });

  // Helper function for percentage calculations
  const calculatePercentage = (numerator, denominator) =>
    denominator ? (numerator / denominator) * 100 : 0;

  // Calculate other derived fields for variance
  const actualRevenue = safeParse(actualData, `Revenue${actualType}`);
  const compareRevenue = safeParse(compareData, `Revenue${compareType}`);
  varianceData['GrossMargin'] = calculatePercentage(
    varianceData['GrossProfit'],
    varianceData['Revenue']
  );

  varianceData['sgaPercentOfRevenue'] =
    calculatePercentage(
      safeParse(actualData, `SGA${actualType}`),
      actualRevenue
    ) -
    calculatePercentage(
      safeParse(compareData, `SGA${compareType}`),
      compareRevenue
    );

  varianceData['ebitdaPercentOfRevenue'] =
    calculatePercentage(
      safeParse(actualData, `EBITDA${actualType}`),
      actualRevenue
    ) -
    calculatePercentage(
      safeParse(compareData, `EBITDA${compareType}`),
      compareRevenue
    );

  varianceData['NetDebt'] =
    safeParse(actualData, `TotalDebt${actualType}`) -
    safeParse(actualData, `Cash${actualType}`) -
    (safeParse(compareData, `TotalDebt${compareType}`) -
      safeParse(compareData, `Cash${compareType}`));

  return varianceData;
}

async function getPreviousYearData(connection, companyName, currentMonthYear) {
  try {
    const [rows] = await connection.query(
      `
        SELECT * 
        FROM bcp.portfolio_companies_format
        WHERE CompanyName = ?
        AND DATE_FORMAT(MonthYear, '%m') = DATE_FORMAT(?, '%m')
        AND DATE_FORMAT(MonthYear, '%Y') < DATE_FORMAT(?, '%Y')
        ORDER BY MonthYear DESC
        LIMIT 1;
      `,
      [companyName, currentMonthYear, currentMonthYear]
    );

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
        EmployeesActual: rows[0].EmployeesActual || 0,
      };

      // Log the constructed prior data
      // console.log('Constructed prior data:', priorData);
      return priorData;
    }

    // console.log('No prior data found');
    return null;
  } catch (error) {
    console.error('Error getting prior data:', error);
    throw error;
  }
}
