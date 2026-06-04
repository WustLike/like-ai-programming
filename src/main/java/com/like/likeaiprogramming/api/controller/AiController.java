package com.like.likeaiprogramming.api.controller;

import com.like.likeaiprogramming.api.dto.ChatRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiController {
    private static final Logger logger = LoggerFactory.getLogger(AiController.class);

    @Resource(name = "deepseek")
    private ChatClient deepseekChatClient;

    @Resource(name = "claude")
    private ChatClient claudeChatClient;

    // 简单对话接口
    @PostMapping("/chat")
    public Map<String, Object> chat(@RequestBody ChatRequest request) {
        logger.info("========================deepseek Chat Beginning========================");
        String responseStr =  claudeChatClient.prompt().user(request.getMessage()).call().content();
        Map<String, Object> response = new HashMap<>();
        response.put("ok", true);
        response.put("success", true);
        response.put("content", responseStr);
        return response;
    }

}
