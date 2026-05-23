package cn.peakxy.input.service;

import cn.peakxy.input.controller.dto.HotwordRequest;
import cn.peakxy.input.controller.dto.HotwordResponse;
import cn.peakxy.input.domain.Hotword;
import cn.peakxy.input.repository.HotwordRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class HotwordService {

    private final HotwordRepository hotwordRepository;

    public HotwordService(HotwordRepository hotwordRepository) {
        this.hotwordRepository = hotwordRepository;
    }

    @Transactional(readOnly = true)
    public List<HotwordResponse> list(Long userId) {
        return hotwordRepository.findByUserIdOrderByGroupNameAscIdAsc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<String> words(Long userId, String groupName) {
        return hotwordRepository.findByUserIdAndGroupNameOrderByIdAsc(userId, groupName)
                .stream()
                .map(Hotword::getWord)
                .toList();
    }

    @Transactional
    public HotwordResponse create(Long userId, HotwordRequest request) {
        return toResponse(hotwordRepository.save(new Hotword(userId, normalize(request.groupName()), normalize(request.word()))));
    }

    @Transactional
    public void delete(Long userId, Long id) {
        Hotword hotword = hotwordRepository.findById(id)
                .filter(item -> item.getUserId().equals(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Hotword not found"));
        hotwordRepository.delete(hotword);
    }

    private HotwordResponse toResponse(Hotword hotword) {
        return new HotwordResponse(hotword.getId(), hotword.getGroupName(), hotword.getWord());
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
