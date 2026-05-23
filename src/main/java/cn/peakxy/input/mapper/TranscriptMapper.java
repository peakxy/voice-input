package cn.peakxy.input.mapper;

import cn.peakxy.input.domain.Transcript;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface TranscriptMapper {

    List<Transcript> findRecentByUserId(@Param("userId") Long userId, @Param("limit") int limit);

    int insert(Transcript transcript);
}
