// DOM元素
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const resultArea = document.getElementById('resultArea');
const tokenNotice = document.querySelector('.token-notice');

// 检查配置
if (!CONFIG || CONFIG.API_TOKEN === 'YOUR_TOKEN_HERE') {
    tokenNotice.style.display = 'block';
    sendButton.disabled = true;
}

// 存储delta消息内容
let deltaContent = null;

// 绑定发送按钮点击事件
sendButton.addEventListener('click', handleSendMessage);

// 处理发送消息
async function handleSendMessage() {
    // 获取用户输入
    const content = userInput.value.trim();
    if (!content) {
        alert('请输入要生成的表情包描述！');
        return;
    }

    // 重置delta内容
    deltaContent = null;
    
    // 禁用发送按钮，显示加载状态
    sendButton.disabled = true;
    sendButton.querySelector('.btn-text').textContent = '生成中...';
    resultArea.innerHTML = '<div class="placeholder-text">AI正在努力生成中，请稍候... 🎨</div>';

    try {
        // 准备请求数据
        const requestData = {
            bot_id: '7462199555774693417',
            user_id: '123456789',
            stream: true,
            auto_save_history: true,
            additional_messages: [
                {
                    role: 'user',
                    content: content,
                    content_type: 'text'
                }
            ]
        };

        // 发送请求
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + CONFIG.API_TOKEN,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        // 检查响应状态
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(JSON.stringify(errorData, null, 2));
        }

        // 获取响应流
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // 处理流式响应
        while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            
            // 解码并处理数据
            const text = decoder.decode(value);
            processStreamData(text);
        }

        // 显示最终结果
        displayFinalResult();

    } catch (error) {
        console.error('Error:', error);
        resultArea.innerHTML = `<div class="placeholder-text">😔 生成失败: ${error.message}</div>`;
    } finally {
        // 恢复发送按钮状态
        sendButton.disabled = false;
        sendButton.querySelector('.btn-text').textContent = '生成表情包';
    }
}

// 处理流式数据
function processStreamData(text) {
    const lines = text.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
        if (!line.startsWith('event:') && !line.startsWith('data:')) continue;
        
        try {
            // 检查是否是delta事件
            if (line.startsWith('event:')) {
                const event = line.substring(6).trim();
                if (event === 'conversation.message.delta') {
                    // 找到delta事件，准备处理下一行的数据
                    continue;
                }
            }
            
            // 处理data行
            if (line.startsWith('data:')) {
                const jsonStr = line.substring(5);
                if (jsonStr === '[DONE]') {
                    return;
                }
                
                const jsonData = JSON.parse(jsonStr);
                
                // 如果是delta消息且包含content
                if (jsonData.type === 'answer' && jsonData.content) {
                    deltaContent = jsonData.content;
                    // 实时显示进度
                    resultArea.innerHTML = '<div class="placeholder-text">表情包即将生成完成... ✨</div>';
                }
            }
        } catch (e) {
            console.log('Parse error:', e);
        }
    }
}

// 显示最终结果
function displayFinalResult() {
    if (deltaContent && deltaContent.startsWith('https://')) {
        // 创建图片容器
        const container = document.createElement('div');
        container.style.textAlign = 'center';
        
        // 创建图片元素
        const img = document.createElement('img');
        img.src = deltaContent;
        img.alt = '生成的表情包';
        img.className = 'emoji-image';
        
        // 创建下载链接
        const downloadLink = document.createElement('a');
        downloadLink.href = deltaContent;
        downloadLink.target = '_blank';
        downloadLink.className = 'generate-btn';
        downloadLink.style.marginTop = '15px';
        downloadLink.innerHTML = '<span class="btn-text">查看原图</span><span class="btn-icon">🔍</span>';
        
        // 添加到容器
        container.appendChild(img);
        container.appendChild(downloadLink);
        
        // 显示结果
        resultArea.innerHTML = '';
        resultArea.appendChild(container);
    } else {
        resultArea.innerHTML = '<div class="placeholder-text">😔 未能生成表情包，请重试</div>';
    }
}

// 添加按键监听，支持Enter发送
userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
});
