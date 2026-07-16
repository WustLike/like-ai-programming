package com.like.likeaiprogramming.app.service.impl;

import com.like.likeaiprogramming.api.dto.ChatRequest;
import com.like.likeaiprogramming.app.service.AiChatService;
import org.apache.logging.log4j.util.Strings;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.Assert;
import reactor.core.publisher.Flux;

import javax.annotation.Resource;
import java.util.HashMap;
import java.util.Map;

@Service
public class AiChatServiceImpl implements AiChatService {
    private static final Logger logger = LoggerFactory.getLogger(AiChatServiceImpl.class);

    @Resource(name = "deepseek")
    private ChatClient deepseekChatClient;

    @Resource(name = "claude")
    private ChatClient claudeChatClient;

    @Value("${spring.ai.deepseek.api-key:}")
    private String deepseekApiKey;

    @Value("${spring.ai.anthropic.api-key:}")
    private String claudeApiKey;

    @Override
    public Map<String, Object> aiChat(ChatRequest chatRequest) {
        String model = chatRequest.getModel();
        Assert.notNull(model, "对话AI模型未选择");

        Map<String, Object> response = new HashMap<>();
        String responseStr = Strings.EMPTY;
        switch (model) {
            case "deepseek":
                if (!isApiKeyConfigured(deepseekApiKey)) {
                    return failedResponse("DeepSeek API Key 未配置或仍为占位值，请设置 DEEPSEEK_API_KEY 后重启应用");
                }
                logger.info("========================deepseek Chat Beginning========================");
                try {
                    responseStr =  deepseekChatClient.prompt().user(chatRequest.getMessage()).call().content();
                } catch (Exception e) {
                    logger.error("DeepSeek 对话调用失败", e);
                    return failedResponse("DeepSeek 调用失败：" + readableError(e));
                }
                break;
            case "claude":
                if (!isApiKeyConfigured(claudeApiKey)) {
                    return failedResponse("Claude API Key 未配置，请设置 ANTHROPIC_API_KEY 后重启应用");
                }
                logger.info("========================claude Chat Beginning========================");
                try {
                    responseStr =  claudeChatClient.prompt().user(chatRequest.getMessage()).call().content();
                } catch (Exception e) {
                    logger.error("Claude 对话调用失败", e);
                    return failedResponse("Claude 调用失败：" + readableError(e));
                }
                break;
            default:
                logger.info("========================no correspond ai model========================");
                return failedResponse("不支持的AI模型：" + model);
        }
        if (Strings.isEmpty(responseStr)) {
            return failedResponse("AI模型未返回任何内容");
        } else {
            response.put("ok", true);
            response.put("success", true);
            response.put("content", responseStr);
        }

        return response;
    }

    @Override
    public Flux<String> aiStreamChat(String message, String model) {
        logger.info("========================流式对话开始，模型: {}========================", model);

        ChatClient targetClient;
        switch (model) {
            case "deepseek":
                if (!isApiKeyConfigured(deepseekApiKey)) {
                    return Flux.just("错误：DeepSeek API Key 未配置或仍为占位值，请设置 DEEPSEEK_API_KEY 后重启应用");
                }
                targetClient = deepseekChatClient;
                break;
            case "claude":
                if (!isApiKeyConfigured(claudeApiKey)) {
                    return Flux.just("错误：Claude API Key 未配置，请设置 ANTHROPIC_API_KEY 后重启应用");
                }
                targetClient = claudeChatClient;
                break;
            default:
                // 如果是不支持的模型，返回一个错误信息流
                return Flux.just("错误：不支持的AI模型 - " + model);
        }

        return targetClient.prompt()
                .user(message)
                .stream().content()
                .onErrorResume(e -> {
                    logger.error("{} 流式对话调用失败", model, e);
                    return Flux.just("错误：" + readableError(e));
                });
    }

    private boolean isApiKeyConfigured(String apiKey) {
        return !Strings.isBlank(apiKey) && !"sk-your-key-here".equals(apiKey);
    }

    private Map<String, Object> failedResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("ok", false);
        response.put("success", false);
        response.put("errorMessage", message);
        response.put("content", message);
        return response;
    }

    private String readableError(Throwable e) {
        String message = e.getMessage();
        if (Strings.isBlank(message)) {
            return "未知错误";
        }
        if (message.contains("401") || message.toLowerCase().contains("authentication")) {
            return "认证失败，请检查 API Key 是否正确";
        }
        return message;
    }

}
