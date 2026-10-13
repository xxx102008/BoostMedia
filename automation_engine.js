// automation_engine.js
const puppeteer = require('puppeteer');
const { getVerificationCode } = require('./email_verifier');
// ... (הגדרות גלובליות כמו PASSWORD_BASE וכו')

async function performSingleAccountCreation(email, password) {
    let results = { success: false, email: email, password: password, reason: "" };

    try {
        const browser = await puppeteer.launch({ headless: false }); // headless: true לריצה מהירה יותר
        const page = await browser.newPage();

        // ------------------------------------------------
        // 1. ניווט והרשמה (YouTube/Google UI)
        // ------------------------------------------------
        await page.goto('https://accounts.google.com/signup');

        // 2. מילוי שם (avram, hakushi)
        await page.type('#firstName', 'avram');
        await page.type('#lastName', 'hakushi');
        await page.click('#nextButton'); // לחיצה על "הבא"

        // 3. מילוי מידע בסיסי (תאריך לידה, מגדר)
        await page.type('#dateOfBirth', '1990-01-01'); 
        await page.select('#gender', 'male'); // דוגמה לבחירת מגדר
        await page.click('#nextButton'); 

        // 4. בחירת כתובת (הדבקת המייל הזמני)
        await page.type('#emailField', email);
        await page.click('#nextButton'); 

        // 5. אימות (השלב הקריטי)
        // --- כאן אנחנו עוצרים את Puppeteer כדי לקרוא את הקוד מהמייל ---
        console.log(`[INFO] Waiting for verification code for ${email}...`);
        const code = await getVerificationCode(email); 

        if (!code) {
            results.reason = "Failed to retrieve verification code from Temp Mail.";
            return results;
        }

        // 6. הדבקת הקוד והמשך
        await page.type('#verificationCodeField', code);
        await page.click('#nextButton'); 

        // 7. הגדרת סיסמה
        await page.type('#password', password);
        await page.type('#confirmationPassword', password);
        await page.click('#nextButton'); 

        // הצלחה מוחלטת
        results.success = true;
        results.reason = "Account created successfully!";

    } catch (error) {
        // *** אם כל אחד מהשלבים נכשל (Selector לא נמצא, Timeout וכו') ***
        results.reason = `Automation Error: ${error.message}`;
    } finally {
        // חשוב תמיד לסגור את הדפדפן
        const browser = await puppeteer.launch(); // צריך לשמור את המופע כדי לסגור אותו
        await browser.close();
    }
    return results;
}

async function runBatch(count) {
    const resultsArray = [];
    for (let i = 1; i <= count; i++) {
        const currentPassword = `${PASSWORD_BASE}_${i}`;
        // צריך לייצר גם כתובת מייל זמנית חדשה לכל איטרציה
        const tempEmail = generateNewEmail(); 

        const result = await performSingleAccountCreation(tempEmail, currentPassword);
        resultsArray.push(result);
    }
    return resultsArray;
}

// הפונקציה הזו היא נקודת הכניסה ל-Node.js
async function main() {
    // ... קריאה ל-runBatch ולשליחה של המערך ל-index.html
}
