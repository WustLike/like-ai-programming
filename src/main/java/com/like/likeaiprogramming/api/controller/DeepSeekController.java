package com.like.likeaiprogramming.api.controller;

import com.like.likeaiprogramming.api.dto.ChatRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class DeepSeekController {
    private static final Logger logger = LoggerFactory.getLogger(DeepSeekController.class);

    @Autowired
    private ChatClient chatClient;

    // 简单对话接口
    @PostMapping("/chat")
    public Map<String, Object> chat(@RequestBody ChatRequest request) {
        logger.info("========================Chat Beginning========================");
        String responseStr =  chatClient.prompt().user(request.getMessage()).call().content();
        Map<String, Object> response = new HashMap<>();
        response.put("ok", true);
        response.put("success", true);
        response.put("content", responseStr);
        return response;
    }

}
