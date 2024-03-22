const express = require('express');
const router = express.Router();
const pool = require('./pool');
const bodyParser = require('body-parser');
const moment = require('moment');

const columnMap = {
    "Month/Year": "MonthYear",
    "Company Name": "CompanyName",
    "Revenue Actual": "RevenueActual",
    "Revenue Budget": "RevenueBudget",
    "Gross Profit Actual": "GrossProfitActual",
    "Gross Profit Budget": "GrossProfitBudget",
    "SG & A Actual": "SGAActual",
    "SG & A Budget": "SGABudget",
    "EBITDA Actual": "EBITDAActual",
    "EBITDA Budget": "EBITDABudget",
    "CapEx Actual": "CapExActual",
    "CapEx Budget": "CapExBudget",
    "Fixed Assets (Net) Actual": "FixedAssetsNetActual",
    "Fixed Assets (Net) Budget": "FixedAssetsNetBudget",
    "Cash Actual": "CashActual",
    "Cash Budget": "CashBudget",
    "Total Debt Actual": "TotalDebtActual",
    "Total Debt Budget": "TotalDebtBudget",
    "Accounts Receivable Actual": "AccountsReceivableActual",
    "Accounts Receivable Budget": "AccountsReceivableBudget",
    "Accounts Payable Actual": "AccountsPayableActual",
    "Accounts Payable Budget": "AccountsPayableBudget",
    "Inventory Actual": "InventoryActual",
    "Inventory Budget": "InventoryBudget",
    "Employees Actual": "EmployeesActual",
    "Employees Budget": "EmployeesBudget",
    "Quarter": "Quarter"
  };

  router.post('/', bodyParser.json(), async (req, res) => {
    const { userData, data } = req.body; // Destructure userData and data from req.body
    const { username, organization } = userData; // Extract username and organization from userData
  
    if (!Array.isArray(data) || !data.every(item => typeof item === 'object')) {
      return res.status(400).json({ message: 'Invalid JSON body format' });
    }
  
    try {
      const connection = await pool.getConnection();
      await connection.beginTransaction();
  
      const insertPromises = data.map(row => {
        const values = [organization, username, ...Object.values(row).map(value => typeof value === 'string' ? value.replace(/ /g, '') : value)];
        const columns = ['Organization', 'UserName', ...Object.keys(row).map(key => columnMap[key])];

        console.log('Inserting row:', values); 

        const query1 = 'INSERT INTO Portfolio_Companies_format (' + columns.join(', ') + ') VALUES (?)';
        return connection.query(query1, [values]);
      });
  
      await Promise.all(insertPromises);
      await connection.commit();
      connection.release();
  
      res.status(200).json({ message: 'Data uploaded successfully' });
    } catch (error) {
      console.error('Error inserting data:', error);
      res.status(500).json({ message: 'Error inserting data' });
    }
  });
  
module.exports = router, columnMap;