package com.like.likeaiprogramming.app.service.impl;

import com.like.likeaiprogramming.api.dto.ChatRequest;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class AiChatServiceImplTest {

    @Test
    void aiChatReturnsReadableErrorWhenDeepSeekKeyIsPlaceholder() {
        AiChatServiceImpl service = new AiChatServiceImpl();
        ReflectionTestUtils.setField(service, "deepseekApiKey", "sk-your-key-here");

        ChatRequest request = new ChatRequest();
        request.setModel("deepseek");
        request.setMessage("hello");

        Map<String, Object> response = service.aiChat(request);

        assertThat(response)
                .containsEntry("ok", false)
                .containsEntry("success", false);
        assertThat(response.get("errorMessage").toString()).contains("DEEPSEEK_API_KEY");
    }

    @Test
    void aiStreamChatReturnsReadableErrorWhenDeepSeekKeyIsPlaceholder() {
        AiChatServiceImpl service = new AiChatServiceImpl();
        ReflectionTestUtils.setField(service, "deepseekApiKey", "sk-your-key-here");

        String response = service.aiStreamChat("hello", "deepseek").blockFirst();

        assertThat(response).contains("DEEPSEEK_API_KEY");
    }
}
