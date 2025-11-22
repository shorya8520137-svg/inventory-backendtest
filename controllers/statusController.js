const db = require('../db/connection');
const XLSX = require('xlsx');
const fs = require('fs');

// 🗺️ Warehouse Table Map
const warehouseMap = {
    'Mumbai Warehouse': 'Mumbai_Warehouse',
    'Hyderabad Warehouse': 'Hyderabad_Warehouse',
    'Ahmedabad Warehouse': 'Ahmedabad_Warehouse',
    'Bangalore Warehouse': 'Bangalore_Warehouse',
    'Gurgaon Warehouse': 'Gurgaon_Warehouse'
};

/* ============================================================
   🚀 NEW BULK UPLOAD STATUS API (NO FLOW DISTURBED)
   ============================================================ */

exports.bulkUploadStatus = (req, res) => {
    console.log('[StatusController] 📥 bulkUploadStatus triggered');

    if (!req.file) {
        return res.status(400).json({ error: 'Excel file is required' });
    }

    const { warehouse } = req.body;

    if (!warehouse) {
        return res.status(400).json({ error: 'Warehouse is required' });
    }

    const tableName = warehouseMap[warehouse.trim()];
    if (!tableName) {
        return res.status(400).json({ error: 'Invalid warehouse selected' });
    }

    const filePath = req.file.path;

    try {
        // Read Excel
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        let updated = [];
        let notFound = [];
        let errors = [];

        // Process Each Row
        const promises = sheetData.map(row => {
            return new Promise(resolve => {
                const awb = row.awb;
                const newStatus = row.status;

                if (!awb || !newStatus) {
                    errors.push(`Invalid row: Missing awb or status`);
                    return resolve();
                }

                // Check if AWB exists
                db.query(
                    `SELECT awb FROM \`${tableName}\` WHERE awb = ?`,
                    [awb],
                    (err, results) => {
                        if (err) {
                            errors.push(`DB error for AWB ${awb}: ${err.message}`);
                            return resolve();
                        }

                        if (results.length === 0) {
                            // Not exist — skip
                            notFound.push(awb);
                            return resolve();
                        }

                        // Update Status
                        db.query(
                            `UPDATE \`${tableName}\` SET status = ? WHERE awb = ?`,
                            [newStatus, awb],
                            err2 => {
                                if (err2) {
                                    errors.push(`Failed to update AWB ${awb}: ${err2.message}`);
                                } else {
                                    updated.push(awb);
                                }
                                return resolve();
                            }
                        );
                    }
                );
            });
        });

        Promise.all(promises).then(() => {
            fs.unlinkSync(filePath); // Remove uploaded file

            console.log('[StatusController] ✅ Bulk upload completed');

            res.status(200).json({
                success: true,
                message: 'Bulk status update completed',
                updatedCount: updated.length,
                notFoundCount: notFound.length,
                failedCount: errors.length,
                updatedAWB: updated,
                notFoundAWB: notFound,
                errors
            });
        });

    } catch (e) {
        console.error('[StatusController] ❌ Excel parsing failed:', e.message);
        return res.status(500).json({ error: 'Excel file processing failed' });
    }
};
