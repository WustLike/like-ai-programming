package com.like.likeaiprogramming.infra;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.CharacterEncodingFilter;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Bean
    public FilterRegistrationBean<CharacterEncodingFilter> encodingFilter() {
        FilterRegistrationBean<CharacterEncodingFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new CharacterEncodingFilter());
        registration.addInitParameter("encoding", "UTF-8");
        registration.addInitParameter("forceEncoding", "true");
        registration.addUrlPatterns("/*");
        return registration;
    }

}
