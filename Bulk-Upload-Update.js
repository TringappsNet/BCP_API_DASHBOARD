const express = require("express");
const router = express.Router();
const pool = require("./pool");
const bodyParser = require("body-parser");
const moment = require("moment");

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

    for (const newData of data) {
      const monthYear = newData["MonthYear"].toLowerCase().replace(/\s/g, '');
      const companyName = newData["CompanyName"].toLowerCase().replace(/\s/g, '');
   
      const [existingRows] = await connection.query(
        "SELECT * FROM Portfolio_Companies_format WHERE MonthYear = ? AND CompanyName = ?",
        [monthYear, companyName]
        
      );
    
      if (existingRows.length > 0) {
        // Update existing row
        const updateValue = {
          ...newData,
          ID: existingRows[0].ID,
        };
        updateValues.push(updateValue);
      } else {
        // Insert new row
        const insertValue = {
          Org_ID: orgID,
          UserName: username,
          Role_ID: roleID,
          ...newData,
        };
        insertValues.push(insertValue);
      }
    }
    

    // Bulk update
    if (updateValues.length > 0) {
      const updateQuery =
        "UPDATE Portfolio_Companies_format SET ? WHERE ID = ?";
      for (const updateValue of updateValues) {
        await connection.query(updateQuery, [updateValue, updateValue.ID]);
      }
      console.log("Update Completed");
    }

    // Bulk insert
    if (insertValues.length > 0) {
      const batchSize = 100; // Adjust batch size as needed
      for (let i = 0; i < insertValues.length; i += batchSize) {
        const batch = insertValues.slice(i, i + batchSize);
        const columns = Object.keys(batch[0]); // Assuming all objects in the batch have the same keys
        const placeholders = batch
          .map(() => `(${columns.map(() => "?").join(",")})`)
          .join(",");
        const values = batch.flatMap((item) => columns.map((col) => item[col]));
        const insertQuery = `INSERT INTO Portfolio_Companies_format (${columns.join(
          ", "
        )}) VALUES ${placeholders}`;
        await connection.query(insertQuery, values);
      }
    }

    await connection.commit();
    connection.release();

    res.status(200).json({ message: "Data uploaded successfully" });
  } catch (error) {
    console.error("Error inserting/updating data:", error);
    res.status(500).json({ message: "Error inserting/updating data" });
  }
});

module.exports = router;
