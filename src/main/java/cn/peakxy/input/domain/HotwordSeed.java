package cn.peakxy.input.domain;

import java.time.LocalDateTime;

public class HotwordSeed {

    private Long id;
    private String word;
    private String groupName;
    private String source;
    private Integer score;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public HotwordSeed() {
    }

    public HotwordSeed(String word, String groupName, String source, Integer score) {
        this.word = word;
        this.groupName = groupName;
        this.source = source;
        this.score = score;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getWord() {
        return word;
    }

    public void setWord(String word) {
        this.word = word;
    }

    public String getGroupName() {
        return groupName;
    }

    public void setGroupName(String groupName) {
        this.groupName = groupName;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public Integer getScore() {
        return score;
    }

    public void setScore(Integer score) {
        this.score = score;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
