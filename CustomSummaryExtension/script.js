// CustomSummary Extension for SillyTavern
const extensionName = 'CustomSummary';
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

// 默认设置
const defaultSettings = {
    apiUrl: '',
    apiKey: ''
};

// 获取设置
function getSettings() {
    const settings = JSON.parse(localStorage.getItem(`${extensionName}_settings`)) || defaultSettings;
    return { ...defaultSettings, ...settings };
}

// 保存设置
function saveSettings(settings) {
    localStorage.setItem(`${extensionName}_settings`, JSON.stringify(settings));
    toastr.success('设置已保存');
}

// 加载设置到界面
function loadSettings() {
    const settings = getSettings();
    const apiUrlInput = document.getElementById('custom_summary_api_url');
    const apiKeyInput = document.getElementById('custom_summary_api_key');
    
    if (apiUrlInput) {
        apiUrlInput.value = settings.apiUrl || '';
    }
    if (apiKeyInput) {
        apiKeyInput.value = settings.apiKey || '';
    }
}

// 初始化设置页面
function initSettings() {
    // 加载已保存的设置
    loadSettings();
    
    // 绑定保存按钮事件
    const saveButton = document.getElementById('custom_summary_save_settings');
    if (saveButton) {
        saveButton.addEventListener('click', function() {
            const apiUrl = document.getElementById('custom_summary_api_url').value.trim();
            const apiKey = document.getElementById('custom_summary_api_key').value.trim();
            
            const settings = {
                apiUrl: apiUrl,
                apiKey: apiKey
            };
            
            saveSettings(settings);
        });
    }
    
    // 初始化折叠面板
    const drawerToggle = document.querySelector('.custom_summary_settings .inline-drawer-toggle');
    if (drawerToggle) {
        drawerToggle.addEventListener('click', function() {
            const drawer = this.closest('.inline-drawer');
            const content = drawer.querySelector('.inline-drawer-content');
            const icon = this.querySelector('.inline-drawer-icon');
            
            if (drawer.classList.contains('open')) {
                drawer.classList.remove('open');
                content.style.display = 'none';
                icon.classList.add('down');
                icon.classList.remove('up');
            } else {
                drawer.classList.add('open');
                content.style.display = 'block';
                icon.classList.remove('down');
                icon.classList.add('up');
            }
        });
    }
}

// 调用自定义 API 进行总结
async function generateCustomSummary(messages, currentSummary = '') {
    const settings = getSettings();
    
    if (!settings.apiUrl) {
        toastr.error('请先在设置中配置 API URL');
        return null;
    }
    
    try {
        // 准备请求数据
        const requestData = {
            messages: messages,
            current_summary: currentSummary,
            api_key: settings.apiKey || undefined
        };
        
        // 发送 API 请求
        const response = await fetch(settings.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(settings.apiKey ? { 'Authorization': `Bearer ${settings.apiKey}` } : {}),
                ...(settings.apiKey ? { 'X-API-Key': settings.apiKey } : {})
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 处理不同的响应格式
        if (data.summary) {
            return data.summary;
        } else if (data.text) {
            return data.text;
        } else if (typeof data === 'string') {
            return data;
        } else {
            return JSON.stringify(data);
        }
    } catch (error) {
        console.error('自定义总结生成失败:', error);
        toastr.error(`总结生成失败: ${error.message}`);
        return null;
    }
}

// 获取对话消息
function getChatMessages() {
    if (typeof getChat !== 'undefined') {
        const chat = getChat();
        if (chat && chat.chat) {
            return chat.chat;
        }
    }
    
    // 备用方法：从全局变量获取
    if (typeof chat !== 'undefined' && chat.chat) {
        return chat.chat;
    }
    
    return [];
}

// 获取当前总结
function getCurrentSummary() {
    if (typeof getChat !== 'undefined') {
        const chat = getChat();
        if (chat && chat.metadata && chat.metadata.summary) {
            return chat.metadata.summary;
        }
    }
    
    // 备用方法
    if (typeof chat !== 'undefined' && chat.metadata && chat.metadata.summary) {
        return chat.metadata.summary;
    }
    
    return '';
}

// 更新总结
function updateSummary(newSummary) {
    if (typeof setSummary !== 'undefined') {
        setSummary(newSummary);
        toastr.success('总结已更新');
        return true;
    }
    
    // 备用方法：直接更新 metadata
    if (typeof chat !== 'undefined' && chat.metadata) {
        chat.metadata.summary = newSummary;
        toastr.success('总结已更新');
        return true;
    }
    
    toastr.warning('无法更新总结：未找到更新方法');
    return false;
}

// 生成总结（主函数）
async function generateSummary() {
    const messages = getChatMessages();
    const currentSummary = getCurrentSummary();
    
    if (!messages || messages.length === 0) {
        toastr.warning('没有可总结的消息');
        return;
    }
    
    // 显示加载提示
    toastr.info('正在生成总结...', '', { timeOut: 0 });
    
    try {
        const summary = await generateCustomSummary(messages, currentSummary);
        
        if (summary) {
            updateSummary(summary);
        }
    } catch (error) {
        console.error('生成总结时出错:', error);
        toastr.error(`生成总结失败: ${error.message}`);
    } finally {
        toastr.clear();
    }
}

// 添加总结按钮到 UI
function addSummaryButton() {
    // 等待聊天界面加载
    const checkInterval = setInterval(() => {
        // 尝试在多个位置添加按钮
        const chatControls = document.querySelector('.chat_controls') || 
                            document.querySelector('.chat-controls') ||
                            document.querySelector('#chat_controls');
        
        if (chatControls && !document.getElementById('custom_summary_button')) {
            const summaryButton = document.createElement('button');
            summaryButton.id = 'custom_summary_button';
            summaryButton.className = 'menu_button';
            summaryButton.innerHTML = '<i class="fa-solid fa-file-text"></i> 自定义总结';
            summaryButton.title = '使用自定义 API 生成对话总结';
            summaryButton.addEventListener('click', generateSummary);
            
            chatControls.appendChild(summaryButton);
            clearInterval(checkInterval);
        }
    }, 1000);
    
    // 10秒后停止检查
    setTimeout(() => clearInterval(checkInterval), 10000);
}

// 扩展初始化
async function onExtensionFullyLoaded() {
    console.log(`${extensionName} 扩展已加载`);
    
    // 等待设置页面加载
    if (document.getElementById('custom_summary_api_url')) {
        initSettings();
    } else {
        // 如果设置页面还未加载，等待 DOM 更新
        const observer = new MutationObserver(function(mutations) {
            if (document.getElementById('custom_summary_api_url')) {
                initSettings();
                observer.disconnect();
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // 添加总结按钮
    addSummaryButton();
}

// 导出函数供 SillyTavern 调用
if (typeof window !== 'undefined') {
    window.CustomSummary = {
        getSettings: getSettings,
        saveSettings: saveSettings,
        generateSummary: generateSummary,
        generateCustomSummary: generateCustomSummary,
        updateSummary: updateSummary,
        onExtensionFullyLoaded: onExtensionFullyLoaded
    };
}

// 自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onExtensionFullyLoaded);
} else {
    onExtensionFullyLoaded();
}

