const db = require('../db/connection');

exports.submitReturnEntry = async (req, res) => {
    console.log('[ReturnController] 🔥 Triggered with:', req.body);

    const { orderRef, awb, productType, inventory, quantity } = req.body;

    if (!orderRef || !awb || !productType || !inventory || !quantity) {
        console.warn('[ReturnController] ⚠️ Missing fields:', {
            orderRef, awb, productType, inventory, quantity
        });
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const qty = parseInt(quantity);

    const inventoryMap = {
        ahmedabad: 'ahmedabad_inventory',
        bangalore: 'bangalore_inventory',
        gurgaon: 'gurgaon_inventory',
        hyderabad: 'hyderabad_inventory',
        mumbai: 'mumbai_inventory'
    };

    const inventoryKey = inventory.toLowerCase();
    const inventoryTable = inventoryMap[inventoryKey];

    if (!inventoryTable) {
        console.warn('[ReturnController] ❌ Unknown inventory:', inventory);
        return res.status(400).json({ error: 'Unknown inventory location' });
    }

    // ✅ Extract product name and barcode
    const [rawName, rawBarcode] = productType.split(/–|—/).map(s => s.trim());
    const productName = rawName.replace(/\s+/g, ' ').replace(/\u00A0|\u200B|\uFEFF/g, '');
    const barcode = rawBarcode?.replace(/\s+/g, '').replace(/\u00A0|\u200B|\uFEFF/g, '');

    console.log('[ReturnController] 🧪 Product name:', productName);
    console.log('[ReturnController] 🧪 Barcode:', barcode);

    // ✅ Step 1: Insert into returns table (audit trail)
    const insertQuery = `
        INSERT INTO returns (order_ref, awb, product_type, barcode, inventory, quantity, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;
    const insertValues = [orderRef, awb, productName, barcode, inventoryKey, qty];

    db.execute(insertQuery, insertValues, (err) => {
        if (err) {
            console.error('[ReturnController] ❌ Insert Error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        console.log('[ReturnController] ✅ Return entry inserted');

        // ✅ Step 2: Update inventory
        const updateQuery = `
            UPDATE ${inventoryTable}
            SET stock = stock + ?, \`return\` = \`return\` + ?
            WHERE code = ?
        `;
        const updateValues = [qty, qty, barcode];

        db.execute(updateQuery, updateValues, (err, updateResult) => {
            if (err) {
                console.error('[ReturnController] ❌ Inventory update failed:', err);
                return res.status(500).json({ error: 'Inventory update failed' });
            }

            console.log('[ReturnController] 🔧 Inventory updated:', updateResult);
            res.status(200).json({ message: 'Return processed and inventory updated successfully' });
        });
    });
};