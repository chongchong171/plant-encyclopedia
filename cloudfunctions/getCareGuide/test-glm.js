const fetch = require('node-fetch');

const GLM_API_KEY = '962f865d75934dacb0dba248c39269ff.bYosRiGyN3N1aTNJ';
const plantName = '牵牛花';

const PROMPT_TEMPLATE = `你是一位资深植物爱好者，请直接返回以下 JSON：
{"success":true,"name":"${plantName}","plantProfile":"植物描述","growthHabit":"生长习性","mainValue":"主要价值","careGuide":{"light":"光照","water":"浇水"},"difficultyLevel":3,"difficultyText":"中等难度","quickTips":["要点1"],"commonProblems":["问题1"]}

要求：1.只返回 JSON 2.不要解释`;

async function test() {
  console.log('测试植物:', plantName);
  console.log('开始调用 GLM API...');

  const startTime = Date.now();

  try {
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GLM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [{ role: 'user', content: PROMPT_TEMPLATE }],
        temperature: 0.1,
        max_tokens: 500
      })
    });

    const data = await response.json();
    console.log('耗时:', Date.now() - startTime, 'ms');
    console.log('GLM 原始返回:', JSON.stringify(data, null, 2));

    if (data.choices && data.choices[0]) {
      const content = data.choices[0].message.content;
      console.log('\n--- Content ---');
      console.log(content);

      // 尝试解析 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('\n--- 解析成功 ---');
          console.log('success:', parsed.success);
          console.log('name:', parsed.name);
          console.log('plantProfile:', parsed.plantProfile);
        } catch (e) {
          console.log('\n--- JSON 解析失败 ---');
          console.log(e.message);
        }
      } else {
        console.log('\n--- 未找到 JSON ---');
      }
    }
  } catch (err) {
    console.log('耗时:', Date.now() - startTime, 'ms');
    console.error('请求失败:', err.message);
  }
}

test();
