package com.like.likeaiprogramming.app.service;

import com.like.likeaiprogramming.api.dto.ChatRequest;

import java.util.Map;

public interface AiChatService {

    /**
     * 根据传参选择模型进行AI对话
     *
     * @param chatRequest
     * @return
     */
    Map<String, Object> aiChat(ChatRequest chatRequest);

}
