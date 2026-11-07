package com.example.hrmanagement.dto;
import java.util.List;

import org.springframework.data.domain.Page;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PageResponseDTO<T> {
	private List<T> content;
	private int page;
	private int size;
	private long totalElements;
	private int totalPages;
	private boolean hasNext;
	private boolean hasPrevious;

	public static <T> PageResponseDTO<T> from(Page<T> page) {
		// @formatter:off
	        return new PageResponseDTO<>(
	                page.getContent(),
	                page.getNumber() + 1,
	                page.getSize(),
	                page.getTotalElements(),
	                page.getTotalPages(),
	                page.hasNext(),
	                page.hasPrevious()
	        );
	     // @formatter:on
	}
}