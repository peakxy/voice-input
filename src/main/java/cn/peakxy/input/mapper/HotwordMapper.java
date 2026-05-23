package cn.peakxy.input.mapper;

import cn.peakxy.input.domain.Hotword;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface HotwordMapper {

    Optional<Hotword> findById(@Param("id") Long id);

    List<Hotword> findByUserIdAndGroupNameOrderByIdAsc(@Param("userId") Long userId,
                                                      @Param("groupName") String groupName);

    List<Hotword> findByUserIdOrderByGroupNameAscIdAsc(@Param("userId") Long userId);

    long countByUserId(@Param("userId") Long userId);

    boolean existsByUserIdAndGroupNameAndWord(@Param("userId") Long userId,
                                              @Param("groupName") String groupName,
                                              @Param("word") String word);

    int insert(Hotword hotword);

    int delete(@Param("id") Long id);
}
