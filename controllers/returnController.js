/**
 * 📦 Return Controller
 * Handles return entries and automatic inventory restocking
 */

const db = require('../db/connection');

exports.submitReturnEntry = async (req, res) => {
    console.log('[ReturnController] 🚀 Triggered with payload:', req.body);

    try {
        const { orderRef, awb, productType, inventory, quantity } = req.body;

        // 🧩 Validate all fields
        if (!orderRef || !awb || !productType || !inventory || !quantity) {
            console.warn('[ReturnController] ⚠️ Missing required fields:', {
                orderRef, awb, productType, inventory, quantity
            });
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                missing: { orderRef, awb, productType, inventory, quantity }
            });
        }

        const qty = parseInt(quantity, 10);
        if (isNaN(qty) || qty <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid quantity' });
        }

        // 🧠 Normalize inventory location
        const inventoryMap = {
            ahmedabad: 'ahmedabad_inventory',
            bangalore: 'bangalore_inventory',
            gurgaon: 'gurgaon_inventory',
            hyderabad: 'hyderabad_inventory',
            mumbai: 'mumbai_inventory'
        };

        const inventoryKey = inventory.trim().toLowerCase();
        const inventoryTable = inventoryMap[inventoryKey];

        if (!inventoryTable) {
            console.warn('[ReturnController] ❌ Unknown inventory:', inventory);
            return res.status(400).json({ success: false, error: 'Invalid inventory location' });
        }

        // 🧼 Clean up productType and extract product + barcode
        const [rawName, rawBarcode] = productType.split(/–|—/).map(s => s.trim());
        const productName = rawName
            ?.replace(/\s+/g, ' ')
            ?.replace(/[\u00A0\u200B\uFEFF]/g, '')
            ?.trim();
        const barcode = rawBarcode
            ?.replace(/\s+/g, '')
            ?.replace(/[\u00A0\u200B\uFEFF]/g, '')
            ?.trim();

        if (!barcode) {
            console.warn('[ReturnController] ⚠️ Barcode missing or malformed:', productType);
            return res.status(400).json({ success: false, error: 'Invalid product format' });
        }

        console.log('[ReturnController] 🧪 Cleaned product:', { productName, barcode });

        // ✅ Step 1: Insert into returns table
        const insertQuery = `
            INSERT INTO returns (order_ref, awb, product_type, barcode, inventory, quantity, submitted_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;
        const insertValues = [orderRef, awb, productName, barcode, inventoryKey, qty];

        const [insertResult] = await db.promise().execute(insertQuery, insertValues);
        console.log('[ReturnController] ✅ Return entry inserted:', insertResult.insertId);

        // ✅ Step 2: Update corresponding inventory
        const updateQuery = `
            UPDATE ${inventoryTable}
            SET stock = stock + ?, \`return\` = \`return\` + ?
            WHERE code = ?
        `;
        const updateValues = [qty, qty, barcode];

        const [updateResult] = await db.promise().execute(updateQuery, updateValues);

        if (updateResult.affectedRows === 0) {
            console.warn('[ReturnController] ⚠️ No matching inventory row found for barcode:', barcode);
            return res.status(404).json({
                success: false,
                message: `No inventory record found for barcode: ${barcode}`
            });
        }

        console.log('[ReturnController] 🔧 Inventory successfully updated:', {
            table: inventoryTable,
            affectedRows: updateResult.affectedRows
        });

        return res.status(200).json({
            success: true,
            message: '✅ Return processed and inventory updated successfully',
            data: {
                orderRef,
                awb,
                product: productName,
                barcode,
                inventory: inventoryKey,
                quantity: qty
            }
        });
    } catch (err) {
        console.error('[ReturnController] ❌ Internal Error:', err);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: err.message
        });
    }
};
