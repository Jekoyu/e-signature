require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: false
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Encryption key and algorithm
const ENCRYPTION_KEY = crypto.randomBytes(32);
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';

// Utility function for encryption
function encryptData(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

// Function to generate QR Code
async function generateQRCode(data) {
    try {
        return await QRCode.toDataURL(data);
    } catch (error) {
        throw new Error('Failed to generate code: ' + error.message);
    }
}

// POST endpoint for data encryption and QR generation
app.post('/e-signature', async (req, res) => {
    try {
        const { data } = req.body;
        
        // Validate input
        if (!data) {
            return res.status(400).json({
                success: false,
                message: 'Data is required'
            });
        }

        // Convert data to string if it's an object/array
        let stringData;
        if (typeof data === 'object') {
            stringData = JSON.stringify(data);
        } else {
            stringData = String(data);
        }

        // Encrypt the data
        const encryptedData = encryptData(stringData);
        
        // Generate QR code from encrypted data
        const qrCodeDataURL = await generateQRCode(encryptedData);

        // Return response
        res.json({
            success: true,
            originalData: data,
            encryptedData: encryptedData,
            qrCode: qrCodeDataURL,
            message: 'Data encrypted and code generated successfully'
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error: ' + error.message
        });
    }
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Express  API',
        status: 'Running',
        endpoints: {
            'POST /e-signature': 'Encrypt data and generate  code'
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API endpoint: http://localhost:${PORT}/e-signature`);
});

module.exports = app;