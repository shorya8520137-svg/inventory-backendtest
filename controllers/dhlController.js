const axios = require('axios');

exports.getDHLTracking = async (req, res) => {
    const { trackingNumber } = req.query;
    const token = process.env.DHL_API_KEY;

    if (!trackingNumber) {
        return res.status(400).json({ error: 'Missing tracking number' });
    }

    try {
        const response = await axios.get(
            `https://api-eu.dhl.com/track/shipments?trackingNumber=${trackingNumber}`,
            {
                headers: {
                    'x-api-key': token,
                    'Content-Type': 'application/json'
                }
            }
        );

        const shipment = response.data?.shipments?.[0];

        if (!shipment) {
            console.warn(`[DHL] ⚠️ TrackingNumber: ${trackingNumber} | No shipment data`);
            return res.status(200).json({
                trackingNumber,
                status: 'Not Found',
                origin: '—',
                destination: '—',
                estimatedDelivery: '—',
                events: [],
                message: 'Tracking info not available yet.'
            });
        }

        res.json({
            trackingNumber,
            status: shipment?.status?.statusCode || '—',
            origin: shipment?.origin?.address?.addressLocality || '—',
            destination: shipment?.destination?.address?.addressLocality || '—',
            estimatedDelivery: shipment?.estimatedDeliveryDate || '—',
            events: shipment?.events || []
        });

    } catch (err) {
        const status = err.response?.status || 500;
        const errorMsg = err.response?.data?.detail || err.message || 'Tracking fetch failed';

        console.error(`[DHL Controller] ❌ TrackingNumber: ${trackingNumber} | ${status} | ${errorMsg}`);
        res.status(status).json({
            trackingNumber,
            status: 'Error',
            origin: '—',
            destination: '—',
            estimatedDelivery: '—',
            events: [],
            error: errorMsg
        });
    }
};