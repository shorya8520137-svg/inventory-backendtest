const axios = require('axios');

exports.getTrackingDetails = async (req, res) => {
    const { awb, ref_id } = req.query;
    const token = process.env.DELIVERY_API_TOKEN;

    if (!awb) {
        return res.status(400).json({ error: 'Missing AWB number' });
    }

    try {
        const response = await axios.get(
            `https://track.delhivery.com/api/v1/packages/json/?waybill=${awb}&ref_ids=${ref_id || ''}`,
            {
                headers: {
                    Authorization: `Token ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const shipment = response.data?.ShipmentData?.[0]?.Shipment;

        if (!shipment) {
            console.warn(`[Tracking] ⚠️ AWB: ${awb} | No shipment data returned`);
            return res.status(200).json({
                awb,
                status: 'Awaiting Pickup',
                current_location: '—',
                eta: '—',
                history: [],
                message: 'Tracking not available yet. Awaiting pickup scan.'
            });
        }

        res.json({
            awb,
            status: shipment?.Status?.Status || '—',
            current_location: shipment?.Status?.StatusLocation || '—',
            eta: shipment?.ExpectedDeliveryDate?.split('T')[0] || '—',
            history: shipment?.Scans || []
        });

    } catch (err) {
        const status = err.response?.status || 500;
        const errorMsg = err.response?.data?.error || err.message || 'Tracking fetch failed';

        console.error(`[Tracking Controller] ❌ AWB: ${awb} | ${status} | ${errorMsg}`);
        res.status(status).json({
            awb,
            status: 'Error',
            current_location: '—',
            eta: '—',
            history: [],
            error: errorMsg
        });
    }
};