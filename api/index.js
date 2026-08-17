const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, push, get, remove, update } = require('firebase/database');

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_ACCESS_CODE = "SamXploit";

const firebaseConfig = {
    apiKey: "AIzaSyByXv08gFFtlW5cStMaOjFEkK-EybTFzA8",
    authDomain: "chat-samudev.firebaseapp.com",
    databaseURL: "https://chat-samudev-default-rtdb.firebaseio.com",
    projectId: "chat-samudev",
    storageBucket: "chat-samudev.appspot.com",
    messagingSenderId: "753343096382",
    appId: "1:753343096382:android:5174bd75dce635ff4d936f"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

app.post('/api/verify-admin', (req, res) => {
    const { code } = req.body;
    if (code === ADMIN_ACCESS_CODE) {
        res.status(200).json({ success: true, message: 'Akses diizinkan' });
    } else {
        res.status(401).json({ success: false, message: 'Kode akses salah!' });
    }
});

app.post('/api/test-smtp', async (req, res) => {
    const { email, password } = req.body;
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: email, pass: password }
        });
        await transporter.verify();
        res.status(200).json({ success: true, message: `SMTP ${email} Berhasil Terhubung!` });
    } catch (error) {
        res.status(500).json({ success: false, message: `Gagal (${email}): ${error.message}` });
    }
});

app.post('/api/test-all-smtp', async (req, res) => {
    try {
        const snapshot = await get(ref(db, 'smtp_accounts'));
        if (!snapshot.exists()) return res.status(400).json({ success: false, message: 'Tidak ada akun SMTP.' });
        
        const accounts = snapshot.val();
        let results = [];

        for (const [id, acc] of Object.entries(accounts)) {
            try {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: { user: acc.email, pass: acc.password }
                });
                await transporter.verify();
                results.push({ email: acc.email, status: 'OK' });
            } catch (err) {
                results.push({ email: acc.email, status: 'Gagal: ' + err.message });
            }
        }
        res.status(200).json({ success: true, results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/smtp', async (req, res) => {
    const { email, password } = req.body;
    try {
        await push(ref(db, 'smtp_accounts'), { email, password });
        res.status(200).json({ success: true, message: 'Akun SMTP berhasil ditambahkan.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/smtp', async (req, res) => {
    try {
        const snapshot = await get(ref(db, 'smtp_accounts'));
        res.status(200).json({ success: true, data: snapshot.exists() ? snapshot.val() : {} });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/smtp/:id', async (req, res) => {
    const { email, password } = req.body;
    try {
        await update(ref(db, `smtp_accounts/${req.params.id}`), { email, password });
        res.status(200).json({ success: true, message: 'Akun SMTP berhasil diperbarui.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/smtp/:id', async (req, res) => {
    try {
        await remove(ref(db, `smtp_accounts/${req.params.id}`));
        res.status(200).json({ success: true, message: 'Akun SMTP berhasil dihapus.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/send', async (req, res) => {
    const { targets, subject, message } = req.body;
    try {
        const snapshot = await get(ref(db, 'smtp_accounts'));
        if (!snapshot.exists()) return res.status(400).json({ success: false, message: 'Tidak ada akun SMTP di database.' });
        
        const accounts = Object.values(snapshot.val());
        const sender = accounts[0]; 

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: sender.email, pass: sender.password }
        });

        const info = await transporter.sendMail({
            from: `"SamuDev Reporter" <${sender.email}>`,
            to: targets.join(', '),
            subject: subject,
            text: message
        });

        res.status(200).json({ success: true, message: 'Laporan berhasil dikirim!', id: info.messageId });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal mengirim: ' + error.message });
    }
});

module.exports = app;
