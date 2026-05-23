package cn.peakxy.input.repository;

import cn.peakxy.input.domain.Transcript;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TranscriptRepository extends JpaRepository<Transcript, Long> {

    List<Transcript> findByUserIdOrderByCreatedAtDesc(Long userId);
}
