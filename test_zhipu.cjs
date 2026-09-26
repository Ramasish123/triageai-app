const crypto = require('crypto');

function generateToken(apikey, expSeconds = 3600) {
    const [id, secret] = apikey.split('.');
    if (!id || !secret) throw new Error('Invalid API key format');
    
    const payload = {
        api_key: id,
        exp: Date.now() + expSeconds * 1000,
        timestamp: Date.now()
    };
    
    const header = {
        alg: 'HS256',
        sign_type: 'SIGN'
    };
    
    const headerStr = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    const sign = crypto
        .createHmac('sha256', secret)
        .update(`${headerStr}.${payloadStr}`)
        .digest('base64url');
        
    return `${headerStr}.${payloadStr}.${sign}`;
}

const apikey = "830ec400064040bba1dc51418acde441.K1IajUuka6ECqCiXnw8M2QF9";
const token = generateToken(apikey);

fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        model: "glm-4",
        messages: [{"role": "user", "content": "Hello"}]
    })
}).then(r => r.json()).then(console.log).catch(console.error);
