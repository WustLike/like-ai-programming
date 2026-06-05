/**
 * AI智能助手 - 主JavaScript文件
 * 所有交互逻辑通过事件监听器绑定
 */

// ==================== 全局状态与配置 ====================
const APP_CONFIG = {
    MAX_RETRIES: 3,
    REQUEST_COOLDOWN: 2000, // 2秒请求冷却
    STREAM_TIMEOUT: 30000,  // 30秒流式响应超时
    API_ENDPOINTS: {
        CHAT: '/api/ai/chat',
        STREAM: '/api/ai/chat/stream'
    }
};

// 应用状态
const APP_STATE = {
    currentEventSource: null,
    isStreaming: false,
    retryCount: 0,
    lastRequestTime: 0
};

// ==================== DOM元素引用 ====================
let DOM_ELEMENTS = {};

// ==================== 核心工具函数 ====================

/**
 * 初始化DOM元素引用
 */
function initDOMElements() {
    DOM_ELEMENTS = {
        chatContainer: document.getElementById('chat-container'),
        chatForm: document.getElementById('chat-form'),
        userInput: document.getElementById('user-input'),
        sendButton: document.getElementById('send-button'),
        statusEl: document.getElementById('status'),
        stopButton: document.getElementById('stop-button'),
        modelRadios: document.querySelectorAll('input[name="model"]')
    };

    // 验证必要元素是否存在
    const requiredElements = ['chatContainer', 'chatForm', 'userInput', 'sendButton'];
    for (const elemName of requiredElements) {
        if (!DOM_ELEMENTS[elemName]) {
            console.error(`找不到必要元素: ${elemName}`);
            return false;
        }
    }

    return true;
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    // 1. 表单提交事件（发送消息）
    DOM_ELEMENTS.chatForm.addEventListener('submit', handleFormSubmit);

    // 2. 输入框键盘事件（回车发送，Shift+Enter换行）
    DOM_ELEMENTS.userInput.addEventListener('keydown', handleInputKeydown);

    // 3. 停止按钮点击事件
    if (DOM_ELEMENTS.stopButton) {
        DOM_ELEMENTS.stopButton.addEventListener('click', handleStopStreaming);
    }

    // 4. 文本域自动调整高度
    DOM_ELEMENTS.userInput.addEventListener('input', handleTextareaResize);

    // 5. 模型切换事件（可选，用于模型切换时的UI反馈）
    DOM_ELEMENTS.modelRadios.forEach(radio => {
        radio.addEventListener('change', handleModelChange);
    });

    console.log('事件监听器设置完成');
}

/**
 * 初始化聊天界面
 */
function initChatUI() {
    console.log('正在初始化聊天界面...');

    // 1. 获取DOM元素
    if (!initDOMElements()) {
        showToast('界面初始化失败，请刷新页面重试', 'error');
        return;
    }

    // 2. 设置事件监听器
    setupEventListeners();

    // 3. 初始界面状态
    updateUIState('ready');

    // 4. 焦点到输入框
    DOM_ELEMENTS.userInput.focus();

    console.log('聊天界面初始化完成');
    showToast('AI助手已就绪', 'success');
}

// ==================== 事件处理器函数 ====================

/**
 * 处理表单提交
 */
function handleFormSubmit(event) {
    event.preventDefault();

    // 检查冷却时间
    const now = Date.now();
    if (now - APP_STATE.lastRequestTime < APP_CONFIG.REQUEST_COOLDOWN) {
        showToast('请求过于频繁，请稍后再试', 'warning');
        return;
    }

    // 更新最后请求时间
    APP_STATE.lastRequestTime = now;

    // 发送消息
    sendMessage();
}

/**
 * 处理输入框按键
 */
function handleInputKeydown(event) {
    // 回车发送，Shift+Enter换行
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        DOM_ELEMENTS.chatForm.dispatchEvent(new Event('submit'));
    }
}

/**
 * 处理文本域自动调整高度
 */
function handleTextareaResize() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
}

/**
 * 处理停止流式响应
 */
function handleStopStreaming() {
    if (APP_STATE.isStreaming) {
        console.log('用户手动停止流式响应');
        cleanupStream();
        updateUIState('stopped');
        showToast('已停止生成', 'info');
    }
}

/**
 * 处理模型切换
 */
function handleModelChange(event) {
    const model = event.target.value;
    console.log(`切换到模型: ${model}`);
    showToast(`已切换至 ${model} 模型`, 'info');
}

// ==================== 消息处理函数 ====================

/**
 * 发送消息（非流式）
 */
async function sendMessage() {
    const message = DOM_ELEMENTS.userInput.value.trim();
    if (!message) {
        showToast('请输入消息内容', 'warning');
        return;
    }

    // 更新UI状态为发送中
    updateUIState('sending');

    // 添加用户消息到界面
    const userMessageId = addMessageToUI('user', message);

    try {
        // 获取选中的模型
        const model = getSelectedModel();

        // 调用API
        const response = await callChatAPI(message, model);

        // 处理API响应
        if (response.success) {
            addMessageToUI('ai', response.content);
        } else {
            addMessageToUI('ai', `错误: ${response.errorMessage || '未知错误'}`);
        }

    } catch (error) {
        console.error('发送消息失败:', error);
        addMessageToUI('ai', `请求失败: ${error.message}`);
    } finally {
        // 重置UI状态
        updateUIState('ready');

        // 清空输入框并恢复焦点
        DOM_ELEMENTS.userInput.value = '';
        DOM_ELEMENTS.userInput.style.height = 'auto';
        DOM_ELEMENTS.userInput.focus();
    }
}

/**
 * 发送流式消息
 */
async function sendStreamMessage() {
    const message = DOM_ELEMENTS.userInput.value.trim();
    if (!message) {
        showToast('请输入消息内容', 'warning');
        return;
    }

    // 防止频繁请求
    const now = Date.now();
    if (now - APP_STATE.lastRequestTime < APP_CONFIG.REQUEST_COOLDOWN) {
        showToast('请求过于频繁，请稍后再试', 'warning');
        return;
    }
    APP_STATE.lastRequestTime = now;

    // 如果已有流式连接，先清理
    if (APP_STATE.currentEventSource) {
        APP_STATE.currentEventSource.close();
        APP_STATE.currentEventSource = null;
    }

    // 更新UI状态
    updateUIState('streaming');

    // 添加用户消息
    addMessageToUI('user', message);

    // 创建AI消息容器（用于流式追加）
    const aiMessageId = 'ai-msg-' + Date.now();
    const aiMessageElement = createMessageElement('ai', '思考中...', aiMessageId);
    appendToChatContainer(aiMessageElement);

    // 开始流式请求
    startStreamRequest(message, aiMessageId);
}

// ==================== API调用函数 ====================

/**
 * 调用聊天API（非流式）
 */
async function callChatAPI(message, model) {
    const response = await fetch(APP_CONFIG.API_ENDPOINTS.CHAT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: message,
            model: model,
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status}`);
    }

    return await response.json();
}

/**
 * 启动流式请求
 */
function startStreamRequest(message, messageId) {
    const model = getSelectedModel();
    const url = `${APP_CONFIG.API_ENDPOINTS.STREAM}?message=${encodeURIComponent(message)}&model=${model}`;

    APP_STATE.isStreaming = true;
    APP_STATE.retryCount = 0;

    // 创建EventSource连接
    APP_STATE.currentEventSource = new EventSource(url);

    // 消息处理
    APP_STATE.currentEventSource.onmessage = (event) => {
        if (event.data && event.data.trim() !== '') {
            appendToMessage(messageId, event.data);
            APP_STATE.retryCount = 0; // 重置重试计数
        }
    };

    // 完成事件
    APP_STATE.currentEventSource.addEventListener('done', () => {
        console.log('流式响应完成');
        completeStreamRequest();
    });

    // 错误处理
    APP_STATE.currentEventSource.onerror = (error) => {
        handleStreamError(error, message, messageId);
    };

    // 设置超时
    const timeoutId = setTimeout(() => {
        if (APP_STATE.isStreaming) {
            console.log('流式响应超时');
            appendToMessage(messageId, '\n[响应超时]');
            completeStreamRequest();
        }
    }, APP_CONFIG.STREAM_TIMEOUT);

    // 保存超时ID
    APP_STATE.currentEventSource._timeoutId = timeoutId;
}

// ==================== UI操作函数 ====================

/**
 * 添加消息到UI
 */
function addMessageToUI(role, content) {
    const messageId = `${role}-msg-${Date.now()}`;
    const messageElement = createMessageElement(role, content, messageId);
    appendToChatContainer(messageElement);
    return messageId;
}

/**
 * 创建消息元素
 */
function createMessageElement(role, content, id) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `flex items-start ${role === 'user' ? 'justify-end' : ''}`;
    messageDiv.id = id;

    // 头像
    const avatarDiv = document.createElement('div');
    avatarDiv.className = `rounded-full p-2 ${role === 'user' ? 'bg-green-100 order-2 ml-3' : 'bg-blue-100 mr-3'}`;

    const avatarIcon = document.createElement('i');
    avatarIcon.className = `fas ${role === 'user' ? 'fa-user text-green-600' : 'fa-robot text-blue-600'}`;
    avatarDiv.appendChild(avatarIcon);

    // 消息内容
    const contentDiv = document.createElement('div');
    contentDiv.className = `flex-1 ${role === 'user' ? 'order-1' : ''}`;

    const roleLabel = document.createElement('div');
    roleLabel.className = `font-bold ${role === 'user' ? 'text-green-700' : 'text-blue-700'}`;
    roleLabel.textContent = role === 'user' ? '你' : 'AI';

    const textDiv = document.createElement('div');
    textDiv.className = 'text-gray-800 mt-1';
    textDiv.textContent = content;

    const timeDiv = document.createElement('div');
    timeDiv.className = 'text-xs text-gray-400 mt-1';
    timeDiv.textContent = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    contentDiv.appendChild(roleLabel);
    contentDiv.appendChild(textDiv);
    contentDiv.appendChild(timeDiv);

    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);

    return messageDiv;
}

/**
 * 追加消息到聊天容器
 */
function appendToChatContainer(element) {
    DOM_ELEMENTS.chatContainer.appendChild(element);
    DOM_ELEMENTS.chatContainer.scrollTop = DOM_ELEMENTS.chatContainer.scrollHeight;
}

/**
 * 向指定消息追加内容（用于流式响应）
 */
function appendToMessage(messageId, content) {
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
        const textDiv = messageElement.querySelector('div.text-gray-800');
        if (textDiv) {
            textDiv.textContent += content;
            DOM_ELEMENTS.chatContainer.scrollTop = DOM_ELEMENTS.chatContainer.scrollHeight;
        }
    }
}

/**
 * 更新UI状态
 */
function updateUIState(state) {
    switch (state) {
        case 'ready':
            DOM_ELEMENTS.userInput.disabled = false;
            DOM_ELEMENTS.sendButton.disabled = false;
            DOM_ELEMENTS.sendButton.innerHTML = '<i class="fas fa-paper-plane mr-2"></i> 发送';
            DOM_ELEMENTS.statusEl.textContent = '就绪';
            if (DOM_ELEMENTS.stopButton) {
                DOM_ELEMENTS.stopButton.classList.add('hidden');
            }
            break;

        case 'sending':
            DOM_ELEMENTS.userInput.disabled = true;
            DOM_ELEMENTS.sendButton.disabled = true;
            DOM_ELEMENTS.sendButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> 思考中...';
            DOM_ELEMENTS.statusEl.textContent = '思考中...';
            break;

        case 'streaming':
            DOM_ELEMENTS.userInput.disabled = true;
            DOM_ELEMENTS.sendButton.disabled = true;
            DOM_ELEMENTS.sendButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> 生成中...';
            DOM_ELEMENTS.statusEl.textContent = '流式生成中...';
            if (DOM_ELEMENTS.stopButton) {
                DOM_ELEMENTS.stopButton.classList.remove('hidden');
            }
            break;

        case 'stopped':
            DOM_ELEMENTS.statusEl.textContent = '已停止';
            setTimeout(() => updateUIState('ready'), 1500);
            break;
    }
}

// ==================== 流式响应管理函数 ====================

/**
 * 清理流式连接
 */
function cleanupStream() {
    APP_STATE.isStreaming = false;

    if (APP_STATE.currentEventSource) {
        // 清除超时定时器
        if (APP_STATE.currentEventSource._timeoutId) {
            clearTimeout(APP_STATE.currentEventSource._timeoutId);
        }

        // 关闭连接
        APP_STATE.currentEventSource.close();
        APP_STATE.currentEventSource = null;
    }
}

/**
 * 完成流式请求
 */
function completeStreamRequest() {
    cleanupStream();
    updateUIState('ready');
}

/**
 * 处理流式错误
 */
function handleStreamError(error, originalMessage, messageId) {
    console.error('流式响应错误:', error);

    if (APP_STATE.isStreaming) {
        APP_STATE.retryCount++;

        if (APP_STATE.retryCount <= APP_CONFIG.MAX_RETRIES) {
            console.log(`尝试重连 (${APP_STATE.retryCount}/${APP_CONFIG.MAX_RETRIES})...`);
            DOM_ELEMENTS.statusEl.textContent = `连接中断，正在重试 (${APP_STATE.retryCount}/${APP_CONFIG.MAX_RETRIES})...`;

            // 延迟重试
            setTimeout(() => {
                if (APP_STATE.currentEventSource) {
                    APP_STATE.currentEventSource.close();
                }
                startStreamRequest(originalMessage, messageId);
            }, 1000 * APP_STATE.retryCount);
        } else {
            console.log("达到最大重试次数，停止重试");
            appendToMessage(messageId, '\n[连接已断开，无法继续获取响应]');
            completeStreamRequest();
        }
    }
}

// ==================== 工具函数 ====================

/**
 * 获取选中的模型
 */
function getSelectedModel() {
    const selectedRadio = document.querySelector('input[name="model"]:checked');
    return selectedRadio ? selectedRadio.value : 'deepseek';
}

/**
 * 显示Toast提示
 */
function showToast(message, type = 'info') {
    // 创建toast容器（如果不存在）
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(toastContainer);
    }

    // 创建toast元素
    const toast = document.createElement('div');

    const typeClasses = {
        info: 'bg-blue-100 border-blue-400 text-blue-700',
        success: 'bg-green-100 border-green-400 text-green-700',
        warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
        error: 'bg-red-100 border-red-400 text-red-700'
    };

    toast.className = `px-4 py-3 rounded-lg border ${typeClasses[type] || typeClasses.info}
                       transition-all duration-300 transform translate-x-full opacity-0`;

    const iconClass = {
        info: 'fa-info-circle',
        success: 'fa-check-circle',
        warning: 'fa-exclamation-triangle',
        error: 'fa-times-circle'
    }[type];

    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${iconClass} mr-2"></i>
            <span>${message}</span>
        </div>
    `;

    toastContainer.appendChild(toast);

    // 触发动画
    setTimeout(() => {
        toast.classList.remove('translate-x-full', 'opacity-0');
        toast.classList.add('translate-x-0', 'opacity-100');
    }, 10);

    // 3秒后移除
    setTimeout(() => {
        toast.classList.remove('translate-x-0', 'opacity-100');
        toast.classList.add('translate-x-full', 'opacity-0');

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// ==================== 初始化入口 ====================

/**
 * 页面加载完成后初始化应用
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM加载完成，开始初始化应用...');

    // 初始化聊天界面
    initChatUI();

    // 添加键盘快捷键（全局）
    document.addEventListener('keydown', function(event) {
        // Ctrl+Enter 发送消息
        if (event.ctrlKey && event.key === 'Enter') {
            event.preventDefault();
            DOM_ELEMENTS.chatForm.dispatchEvent(new Event('submit'));
        }

        // ESC 停止流式响应
        if (event.key === 'Escape' && APP_STATE.isStreaming) {
            handleStopStreaming();
        }
    });

    console.log('应用初始化完成');
});