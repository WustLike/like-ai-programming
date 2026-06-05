package com.like.likeaiprogramming.app.service.impl;

import com.like.likeaiprogramming.api.dto.ChatRequest;
import com.like.likeaiprogramming.app.service.AiChatService;
import org.apache.logging.log4j.util.Strings;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;
import org.springframework.util.Assert;

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

    @Override
    public Map<String, Object> aiChat(ChatRequest chatRequest) {
        String model = chatRequest.getModel();
        Assert.notNull(model, "对话AI模型未选择");

        Map<String, Object> response = new HashMap<>();
        String responseStr = Strings.EMPTY;
        switch (model) {
            case "deepseek":
                logger.info("========================deepseek Chat Beginning========================");
                responseStr =  deepseekChatClient.prompt().user(chatRequest.getMessage()).call().content();
                break;
            case "claude":
                logger.info("========================claude Chat Beginning========================");
                responseStr =  claudeChatClient.prompt().user(chatRequest.getMessage()).call().content();
                break;
            default:
                logger.info("========================no correspond ai model========================");
        }
        if (Strings.isEmpty(responseStr)) {
            response.put("ok", false);
            response.put("success", false);
            response.put("content", "AI模型未返回任何内容");
        } else {
            response.put("ok", true);
            response.put("success", true);
            response.put("content", responseStr);
        }

        return response;
    }

}
