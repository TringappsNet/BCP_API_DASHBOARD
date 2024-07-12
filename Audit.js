const express = require('express');
const router = express.Router();
const pool = require('./pool');

// POST route to insert audit log
router.post('/', async (req, res) => {
  try {
    const auditLog = req.body;
    await pool.query('INSERT INTO portfolio_audit SET ?', auditLog);
    res.status(200).json({ message: 'Audit log added successfully' });
  } catch (error) {
    console.error('Error adding audit log:', error);
    res.status(500).json({ message: 'Error adding audit log' });
  }
});

// GET route to fetch all audit logs
router.get('/get', async (req, res) => {
  try {
    const query = `
      SELECT 
        pa.ID,
        pa.Org_Id,
        pa.MonthYear,
        pa.CompanyName,
        pa.RevenueActual,
        pa.RevenueBudget,
        pa.GrossProfitActual,
        pa.GrossProfitBudget,
        pa.SGAActual,
        pa.SGABudget,
        pa.EBITDAActual,
        pa.EBITDABudget,
        pa.CapExActual,
        pa.CapExBudget,
        pa.FixedAssetsNetActual,
        pa.FixedAssetsNetBudget,
        pa.CashActual,
        pa.CashBudget,
        pa.TotalDebtActual,
        pa.TotalDebtBudget,
        pa.AccountsReceivableActual,
        pa.AccountsReceivableBudget,
        pa.AccountsPayableActual,
        pa.AccountsPayableBudget,
        pa.InventoryActual,
        pa.InventoryBudget,
        pa.EmployeesActual,
        pa.EmployeesBudget,
        pa.Quarter,
        u.UserName AS ModifiedBy,
        pa.ModificationTime,
        pa.UserAction
      FROM 
        portfolio_audit pa
      LEFT JOIN 
        users u 
      ON 
        pa.ModifiedBy = u.UserID
    `;
    const [auditLogs] = await pool.query(query);
    res.status(200).json(auditLogs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Error fetching audit logs' });
  }
});



module.exports = router;
