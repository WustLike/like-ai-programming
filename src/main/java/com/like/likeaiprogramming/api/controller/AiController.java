package com.like.likeaiprogramming.api.controller;

import com.like.likeaiprogramming.api.dto.ChatRequest;
import com.like.likeaiprogramming.app.service.AiChatService;
import com.like.likeaiprogramming.app.service.impl.AiChatServiceImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/ai")
public class AiController {
    private static final Logger logger = LoggerFactory.getLogger(AiChatServiceImpl.class);

    @Autowired
    private AiChatService aiChatService;

    // 简单对话接口
    @PostMapping("/chat")
    public Map<String, Object> chat(@RequestBody ChatRequest request) {
        return aiChatService.aiChat(request);
    }

    // 流式对话接口
    @GetMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> streamChat(@RequestParam String message,
                                                    @RequestParam(defaultValue = "deepseek") String model) {
        return aiChatService.aiStreamChat(message, model)
                .map(content -> ServerSentEvent.builder(content)
                        .id(UUID.randomUUID().toString())
                        .event("message")
                        .build())
                .concatWith(Flux.just(
                        ServerSentEvent.builder("")
                                .event("done")  // 发送结束事件
                                .build()
                ))
                .doOnComplete(() -> {
                    // 连接正常完成
                    logger.info("SSE连接正常结束");
                })
                .doOnError(e -> {
                    // 连接发生错误
                    logger.error("SSE连接错误", e);
                });
    }

}
