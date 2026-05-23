package cn.peakxy.input.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "hotword")
public class Hotword {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "group_name", nullable = false, length = 32)
    private String groupName;

    @Column(nullable = false, length = 255)
    private String word;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected Hotword() {
    }

    public Hotword(Long userId, String groupName, String word) {
        this.userId = userId;
        this.groupName = groupName;
        this.word = word;
    }

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getGroupName() {
        return groupName;
    }

    public String getWord() {
        return word;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
