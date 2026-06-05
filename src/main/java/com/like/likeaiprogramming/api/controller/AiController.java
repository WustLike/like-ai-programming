package com.like.likeaiprogramming.api.controller;

import com.like.likeaiprogramming.api.dto.ChatRequest;
import com.like.likeaiprogramming.app.service.AiChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    @Autowired
    private AiChatService aiChatService;

    // 简单对话接口
    @PostMapping("/chat")
    public Map<String, Object> chat(@RequestBody ChatRequest request) {
        return aiChatService.aiChat(request);
    }

}
