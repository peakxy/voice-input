package cn.peakxy.input.service;

import cn.peakxy.input.controller.dto.HotwordRequest;
import cn.peakxy.input.controller.dto.HotwordResponse;
import cn.peakxy.input.domain.Hotword;
import cn.peakxy.input.mapper.HotwordMapper;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class HotwordService {

    private final HotwordMapper hotwordMapper;

    public HotwordService(HotwordMapper hotwordMapper) {
        this.hotwordMapper = hotwordMapper;
    }

    @Cacheable(cacheNames = "hotwordListByUser", key = "#userId")
    @Transactional(readOnly = true)
    public List<HotwordResponse> list(Long userId) {
        return hotwordMapper.findByUserIdOrderByGroupNameAscIdAsc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Cacheable(cacheNames = "hotwordsByUserGroup", key = "#userId + ':' + #groupName")
    @Transactional(readOnly = true)
    public List<String> words(Long userId, String groupName) {
        return hotwordMapper.findByUserIdAndGroupNameOrderByIdAsc(userId, groupName)
                .stream()
                .map(Hotword::getWord)
                .toList();
    }

    public long countByUserId(Long userId) {
        return hotwordMapper.countByUserId(userId);
    }

    @Caching(evict = {
            @CacheEvict(cacheNames = "hotwordListByUser", key = "#userId"),
            @CacheEvict(cacheNames = "hotwordsByUserGroup", allEntries = true)
    })
    @Transactional
    public HotwordResponse create(Long userId, HotwordRequest request) {
        Hotword hotword = new Hotword(userId, normalize(request.groupName()), normalize(request.word()));
        hotwordMapper.insert(hotword);
        return toResponse(hotword);
    }

    @Caching(evict = {
            @CacheEvict(cacheNames = "hotwordListByUser", key = "#userId"),
            @CacheEvict(cacheNames = "hotwordsByUserGroup", allEntries = true)
    })
    @Transactional
    public void delete(Long userId, Long id) {
        Hotword hotword = hotwordMapper.findById(id)
                .filter(item -> item.getUserId().equals(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Hotword not found"));
        hotwordMapper.delete(hotword.getId());
    }

    @Transactional
    public boolean insertIfAbsent(Long userId, String groupName, String word) {
        if (hotwordMapper.existsByUserIdAndGroupNameAndWord(userId, groupName, word)) {
            return false;
        }
        Hotword hotword = new Hotword(userId, groupName, word);
        hotwordMapper.insert(hotword);
        return true;
    }

    private HotwordResponse toResponse(Hotword hotword) {
        return new HotwordResponse(hotword.getId(), hotword.getGroupName(), hotword.getWord());
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
