/**
 * 使用腾讯云 SCF API 直接部署云函数
 *
 * 微信云开发的云函数底层就是腾讯云 SCF（Serverless Cloud Function）。
 * 我们可以通过腾讯云 API 直接部署，绕过微信开发者工具的 CLI。
 *
 * 需要：
 * 1. SecretId 和 SecretKey（在腾讯云控制台获取）
 * 2. 云环境 ID
 * 3. 云函数代码（打包成 zip）
 */

const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// ⚠️ 需要填写你的腾讯云密钥
const SECRET_ID = 'YOUR_SECRET_ID';
const SECRET_KEY = 'YOUR_SECRET_KEY';
const ENV_ID = 'plant-encyclopedia-8d9x10139590b';
const REGION = 'ap-shanghai'; // 云开发默认区域

function sign(key, msg) {
  return crypto.createHmac('sha256', key).update(msg).digest();
}

function getSignature(secretKey, date, service, request) {
  const kDate = sign(secretKey, date);
  const kService = sign(kDate, service);
  const kSigning = sign(kService, 'tc3_request');
  const signature = sign(kSigning, request).toString('hex');
  return signature;
}

async function zipDirectory(srcDir, destPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(destPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(destPath));
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(srcDir, false);
    archive.finalize();
  });
}

async function callSCFAPI(action, body) {
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date().toISOString().split('T')[0];
  const service = 'scf';
  const host = 'scf.tencentcloudapi.com';
  const contentType = 'application/json; charset=utf-8';
  const payload = JSON.stringify(body);
  const hashedPayload = crypto.createHash('sha256').update(payload).digest('hex');
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
  const signedHeaders = 'content-type;host;x-tc-action';
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${hashedPayload}`;

  const credentialScope = `${date}/${service}/tc3_request`;
  const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
  const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;

  const signature = getSignature(SECRET_KEY, date, service, stringToSign);
  const authorization = `TC3-HMAC-SHA256 Credential=${SECRET_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const headers = {
    'Content-Type': contentType,
    'Host': host,
    'X-TC-Action': action,
    'X-TC-Version': '2018-04-16',
    'X-TC-Timestamp': timestamp.toString(),
    'X-TC-Region': REGION,
    'Authorization': authorization,
  };

  return new Promise((resolve, reject) => {
    const req = https.request(`https://${host}`, {
      method: 'POST',
      headers,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function deployFunction(functionName, functionPath) {
  console.log(`[部署] ${functionName}`);

  // 1. 打包代码
  const zipPath = path.join(__dirname, `${functionName}.zip`);
  await zipDirectory(functionPath, zipPath);
  const zipBase64 = fs.readFileSync(zipPath).toString('base64');
  console.log(`  代码包大小: ${(fs.statSync(zipPath).size / 1024).toFixed(1)} KB`);

  // 2. 检查函数是否存在
  const listRes = await callSCFAPI('ListFunctions', {
    Order: 1,
    OrderBy: 'AddTime',
    Offset: 0,
    Limit: 50,
  });

  console.log('  ListFunctions result:', JSON.stringify(listRes, null, 2));
}

// 主函数
async function main() {
  console.log('=== 腾讯云 SCF API 部署 ===\n');

  if (SECRET_ID === 'YOUR_SECRET_ID') {
    console.log('❌ 请先填写 SECRET_ID 和 SECRET_KEY');
    console.log('   获取地址: https://console.cloud.tencent.com/cam/capi');
    return;
  }

  await deployFunction(
    'batchCachePlantImages',
    path.join(__dirname, 'cloudfunctions', 'batchCachePlantImages')
  );
}

main().catch(console.error);
