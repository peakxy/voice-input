package cn.peakxy.input.mapper;

import cn.peakxy.input.domain.HotwordSeed;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface HotwordSeedMapper {

    int upsert(HotwordSeed seed);

    List<HotwordSeed> findTopByGroup(@Param("groupName") String groupName, @Param("limit") int limit);

    List<HotwordSeed> findAllTopN(@Param("limit") int limit);
}
