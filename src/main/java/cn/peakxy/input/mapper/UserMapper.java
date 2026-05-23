package cn.peakxy.input.mapper;

import cn.peakxy.input.domain.UserAccount;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Optional;

@Mapper
public interface UserMapper {

    Optional<UserAccount> findById(@Param("id") Long id);

    Optional<UserAccount> findByUsername(@Param("username") String username);

    boolean existsByUsername(@Param("username") String username);

    int insert(UserAccount user);
}
