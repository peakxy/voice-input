package cn.peakxy.input.domain;

import java.time.LocalDateTime;

public class Hotword {

    private Long id;
    private Long userId;
    private String groupName;
    private String word;
    private LocalDateTime createdAt;

    public Hotword() {
    }

    public Hotword(Long userId, String groupName, String word) {
        this.userId = userId;
        this.groupName = groupName;
        this.word = word;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getGroupName() {
        return groupName;
    }

    public void setGroupName(String groupName) {
        this.groupName = groupName;
    }

    public String getWord() {
        return word;
    }

    public void setWord(String word) {
        this.word = word;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
