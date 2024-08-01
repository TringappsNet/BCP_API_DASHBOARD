const express = require("express");
const router = express.Router();
const pool = require("./pool");
const bodyParser = require("body-parser");
const moment = require("moment");

/**
 * @swagger
 * /bulk-upload-update:
 *   post:
 *     tags: ['Portfolio']
 *     summary: Upload or update data
 *     description: |
 *       Uploads or updates data to the database.
 *     parameters:
 *       - in: header
 *         name: Session-ID
 *         required: true
 *         schema:
 *           type: string
 *         description: The session ID of the user.
 *       - in: header
 *         name: Email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: The email address of the user uploading the data.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userData:
 *                 type: object
 *                 properties:
 *                   username:
 *                     type: string
 *                     description: The username of the user uploading the data.
 *                   orgID:
 *                     type: integer
 *                     description: The ID of the organization.
 *                   email:
 *                     type: string
 *                     format: email
 *                     description: The email address of the user uploading the data.
 *                   roleID:
 *                     type: integer
 *                     description: The role ID of the user uploading the data.
 *                   userId:
 *                     type: integer
 *                     description: The user ID.
 *               data:
 *                 type: array
 *                 items:
 *                   type: object
 *                   description: |
 *                     An array of objects representing the data to be uploaded or updated. Each object represents a row of data to be inserted or updated in the database.
 *     responses:
 *       '200':
 *         description: Data uploaded or updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message indicating that the data has been uploaded or updated successfully.
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating a bad request, such as missing or invalid input data.
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating unauthorized access due to mismatched email headers.
 *       '403':
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating that the user does not have permission to upload data for the specified organization.
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating an internal server error or unsupported Excel format.
 */

router.post("/", bodyParser.json(), async (req, res) => {
  const sessionId = req.header("Session-ID");
  const emailHeader = req.header("Email");

  if (!sessionId || !emailHeader) {
    return res
      .status(400)
      .json({ message: "Session ID and Email headers are required!" });
  }

  const { userData, data } = req.body;
  const { username, orgID, email, roleID, userId } = userData; 

  if (email !== emailHeader) {
    return res.status(401).json({
      message: "Unauthorized: Email header does not match user data!",
    });
  }

  if (
    !Array.isArray(data) ||
    !data.every((item) => typeof item === "object")
  ) {
    return res
      .status(400)
      .json({ message: "Invalid JSON body format for new data" });
  }

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

     const [orgResult] = await connection.query(
      "SELECT org_name FROM organization WHERE org_ID = ?",
      [orgID]
    );    
    if (roleID !== '1' && data.some(item => item.CompanyName.toLowerCase().replace(/\s/g, '') !== orgResult[0].org_name.toLowerCase().trim().replace(/\s/g, ''))) {
      return res.status(403).json({
        message: "You don't have permission to upload from this Organization",
      });
    }
    
    
    const updateValues = [];
    const insertValues = [];
    const auditLogValues = [];

    // Prepare all queries
    const selectQuery = "SELECT ID FROM portfolio_companies_format WHERE MonthYear = ? AND CompanyName = ?";
    const updateQuery = "UPDATE portfolio_companies_format SET ? WHERE ID = ?";
    const insertQuery = "INSERT INTO portfolio_companies_format SET ?";
    const auditQuery = "INSERT INTO portfolio_audit SET ?";

    // Prepare statements
    const selectStmt = await connection.prepare(selectQuery);
    const updateStmt = await connection.prepare(updateQuery);
    const insertStmt = await connection.prepare(insertQuery);
    const auditStmt = await connection.prepare(auditQuery);

    for (const newData of data) {
      const { MonthYear: monthYear, CompanyName: companyName } = newData;
      
      const [existingRows] = await selectStmt.execute([monthYear, companyName]);
      
      if (existingRows.length > 0) {
        // Update existing row
        updateValues.push({ ...newData, ID: existingRows[0].ID });
        
        auditLogValues.push({
          Org_Id: orgID,
          ModifiedBy: userId,
          UserAction: 'Overridden',
          ...newData
        });
      } else {
        // Insert new row
        insertValues.push({
          Org_ID: orgID,
          UserName: username,
          ...newData
        });
        
        auditLogValues.push({
          Org_Id: orgID,
          ModifiedBy: userId,
          UserAction: 'Insert',
          ...newData
        });
      }
    }

  // Bulk operations
  await Promise.all([
    ...updateValues.map(value => updateStmt.execute([value, value.ID])),
    ...insertValues.map(value => insertStmt.execute([value])),
    ...auditLogValues.map(value => auditStmt.execute([value]))
  ]);

  // Close prepared statements
  await Promise.all([
    selectStmt.close(),
    updateStmt.close(),
    insertStmt.close(),
    auditStmt.close()
  ]);


    
    // Execute all insert promises
    // await Promise.all(insertPromises);
  
    await connection.commit();
    connection.release();

    res.status(200).json({ message: "Data uploaded successfully" });
  } catch (error) {
    console.error("Error inserting/updating data:", error);
    res.status(500).json({ message: "Try Upload later" });
  }
});

module.exports = router;
