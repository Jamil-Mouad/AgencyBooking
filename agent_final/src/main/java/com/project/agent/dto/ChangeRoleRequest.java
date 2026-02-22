package com.project.agent.dto;

import com.project.agent.model.Users.Role;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ChangeRoleRequest {
    @NotNull
    private Role newRole;
}