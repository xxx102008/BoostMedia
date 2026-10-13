// email_verifier.js

const axios = require('axios'); 

async function getVerificationCode(tempEmailAddress) {
    try {
        // *** כאן תגדיר את ה-API Endpoint של Temp Mail ***
        const response = await axios.get(`https://api.tempmailservice.com/check/${tempEmailAddress}`); 

        // *** נניח שה-API מחזיר את הקוד בפורמט זה ***
        const code = response.data.verificationCode; 
        return code;

    } catch (error) {
        console.error("Error fetching verification code:", error.message);
        return null;
    }
}

module.exports = { getVerificationCode };
