package cn.peakxy.input.repository;

import cn.peakxy.input.domain.Hotword;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HotwordRepository extends JpaRepository<Hotword, Long> {

    List<Hotword> findByUserIdAndGroupNameOrderByIdAsc(Long userId, String groupName);

    List<Hotword> findByUserIdOrderByGroupNameAscIdAsc(Long userId);
}
