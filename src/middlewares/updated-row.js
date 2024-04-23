const data = [];
const editedRow = null;

module.exports = (req, res, next) => {
  // Get the editedRow and data from the request body
  req.body.editedRow = req.body.editedRow || editedRow;
  req.body.data = req.body.data || data;
  next();
};