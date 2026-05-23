package cn.peakxy.input;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableAsync
@EnableScheduling
@ConfigurationPropertiesScan
@MapperScan("cn.peakxy.input.mapper")
public class VoiceInputBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(VoiceInputBackendApplication.class, args);
    }
}
