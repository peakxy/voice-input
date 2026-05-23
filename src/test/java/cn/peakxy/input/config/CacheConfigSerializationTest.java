package cn.peakxy.input.config;

import cn.peakxy.input.controller.dto.HotwordResponse;
import cn.peakxy.input.domain.UserAccount;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertEquals;

class CacheConfigSerializationTest {

    private static GenericJackson2JsonRedisSerializer serializer() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.activateDefaultTypingAsProperty(
                BasicPolymorphicTypeValidator.builder().allowIfBaseType(Object.class).build(),
                ObjectMapper.DefaultTyping.EVERYTHING,
                "@class"
        );
        return new GenericJackson2JsonRedisSerializer(mapper);
    }

    @Test
    void redisSerializerPreservesPojoTypeAcrossRoundTrip() {
        GenericJackson2JsonRedisSerializer serializer = serializer();

        UserAccount user = new UserAccount("alice", "hash");
        user.setId(7L);

        Object restored = serializer.deserialize(serializer.serialize(user));

        assertInstanceOf(UserAccount.class, restored);
        assertEquals(7L, ((UserAccount) restored).getId());
        assertEquals("alice", ((UserAccount) restored).getUsername());
    }

    @Test
    void redisSerializerPreservesListElementTypesAcrossRoundTrip() {
        GenericJackson2JsonRedisSerializer serializer = serializer();

        List<HotwordResponse> hotwords = List.of(new HotwordResponse(1L, "通用", "苹果"));

        Object restored = serializer.deserialize(serializer.serialize(hotwords));

        assertInstanceOf(List.class, restored);
        Object first = ((List<?>) restored).get(0);
        assertInstanceOf(HotwordResponse.class, first);
        assertEquals("苹果", ((HotwordResponse) first).word());
    }

    @Test
    void redisSerializerPreservesNestedPojoTypes() {
        GenericJackson2JsonRedisSerializer serializer = serializer();

        UserAccount user = new UserAccount("alice", "hash");
        user.setId(7L);
        List<UserAccount> users = List.of(user);

        Object restored = serializer.deserialize(serializer.serialize(users));

        assertInstanceOf(List.class, restored);
        assertInstanceOf(UserAccount.class, ((List<?>) restored).get(0));
    }
}
