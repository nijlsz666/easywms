package com.easywms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.mybatis.spring.annotation.MapperScan;

@SpringBootApplication
@MapperScan("com.easywms")
public class EasyWmsApplication {
    public static void main(String[] args) {
        SpringApplication.run(EasyWmsApplication.class, args);
    }
}
