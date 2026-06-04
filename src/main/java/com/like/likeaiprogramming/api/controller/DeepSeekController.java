package com.like.likeaiprogramming.api.controller;

import com.like.likeaiprogramming.api.dto.ChatRequest;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/deepseek")
public class DeepSeekController {

    @Autowired
    private ChatClient chatClient;

    // 简单对话接口
    @PostMapping("/simple")
    public String chat(@RequestBody ChatRequest request) {
        return chatClient.prompt()
                .user(request.getMessage()) // 用户输入
                .call()                     // 调用AI
                .content();                 // 获取文本回复
    }

}
