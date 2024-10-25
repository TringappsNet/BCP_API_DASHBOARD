const express = require('express');
const router = express.Router();
const pool = require('./pool');

router.get('/', async (req, res) => {
  const sessionId = req.header('Session-ID');
  const emailHeader = req.header('Email');
  const { roleID, orgID } = req.query;

  // Validate required headers
  if (!sessionId || !emailHeader) {
    return res
      .status(400)
      .json({ message: 'Session ID and Email headers are required!' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Base query with all required fields
    let query = `
      SELECT 
        m.ID,
        m.Org_ID,
        m.UserName,
        m.MonthYear,
        m.CompanyName,
        m.OperatingResultID,
        m.OperatingResultName,
        m.Revenue,
        m.GrossProfit,
        m.GrossMargin,
        m.SGAExpense,
        m.SGAPercentOfRevenue,
        m.EBITDAM,
        m.EBITDAMPercentOfRevenue,
        m.Cash,
        m.AccountsReceivable,
        m.Inventory,
        m.FixedAssetsNet,
        m.AccountsPayable,
        m.TotalDebt,
        m.NetDebt,
        m.CapEx,
        m.Employees,
        m.Quarter,
        o.org_name as OrganizationName
      FROM portfolio_companies_metrics m
      JOIN organization o ON m.Org_ID = o.org_ID
    `;

    let queryParams = [];

    // Apply organization filter for non-admin users
    if (roleID !== '1' && orgID) {
      query += ` WHERE m.Org_ID = ?`;
      queryParams.push(orgID);
    }

    // Add sorting
    // query += ` ORDER BY m.CompanyName, m.MonthYear, m.OperatingResultID`;

    const [results] = await connection.query(query, queryParams);

    // Transform the results to match the required format
    const transformedResults = results.reduce((acc, row) => {
      // Create a unique key for each company-month combination
      const key = `${row.CompanyName}_${row.MonthYear}`;

      if (!acc[key]) {
        // Initialize the base structure for new entries
        acc[key] = {
          organizationId: row.Org_ID.toString(),
          organizationName: row.OrganizationName,
          companyName: row.CompanyName,
          monthYear: row.MonthYear,
          quarter: row.Quarter,
          lastModifiedBy: row.UserName,
          metrics: {
            Actual: {},
            Budget: {},
            Prior: {}
          }
        };
      }

      // Map the metrics based on OperatingResultName
      const metricType = row.OperatingResultName;
      if (metricType) {
        acc[key].metrics[metricType] = {
          revenue: parseFloat(row.Revenue) || 0,
          grossProfit: parseFloat(row.GrossProfit) || 0,
          grossMargin: parseFloat(row.GrossMargin) || 0,
          sgaExpense: parseFloat(row.SGAExpense) || 0,
          sgaPercentOfRevenue: parseFloat(row.SGAPercentOfRevenue) || 0,
          ebitdam: parseFloat(row.EBITDAM) || 0,
          ebitdamPercentOfRevenue: parseFloat(row.EBITDAMPercentOfRevenue) || 0,
          cash: parseFloat(row.Cash) || 0,
          accountsReceivable: parseFloat(row.AccountsReceivable) || 0,
          inventory: parseFloat(row.Inventory) || 0,
          fixedAssetsNet: parseFloat(row.FixedAssetsNet) || 0,
          accountsPayable: parseFloat(row.AccountsPayable) || 0,
          totalDebt: parseFloat(row.TotalDebt) || 0,
          netDebt: parseFloat(row.NetDebt) || 0,
          capEx: parseFloat(row.CapEx) || 0,
          employees: parseFloat(row.Employees) || 0
        };
      }

      return acc;
    }, {});

    res.status(200).json({
      message: 'Data retrieved successfully',
      data: Object.values(transformedResults)
    });

  } catch (error) {
    console.error('Error retrieving metrics:', error);
    res.status(500).json({
      message: 'Error retrieving metrics data',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
