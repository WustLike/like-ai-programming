package com.like.likeaiprogramming.infra;

import org.springframework.ai.anthropic.AnthropicChatModel;
import org.springframework.ai.anthropic.AnthropicChatOptions;
import org.springframework.ai.anthropic.api.AnthropicApi;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.deepseek.DeepSeekChatModel;
import org.springframework.ai.deepseek.api.DeepSeekApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AiConfiguration {

    @Value("${spring.ai.deepseek.api-key}")
    private String deepseekApiKey;

    @Value("${spring.ai.anthropic.api-key}")
    private String claudeApiKey;


    @Bean("deepseek")
    public ChatClient deepseekChatClient() {
        return ChatClient.builder(DeepSeekChatModel.builder().deepSeekApi(DeepSeekApi.builder().apiKey(deepseekApiKey).build()).build()).build();
    }

    @Bean("claude")
    public ChatClient claudeChatClient() {
        return ChatClient.builder(AnthropicChatModel.builder().anthropicApi(AnthropicApi.builder().apiKey(claudeApiKey).build()).build()).build();
    }


}
