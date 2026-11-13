package com.example.hrmanagement.config;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.zip.DataFormatException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.example.hrmanagement.exception.ResourceNotFoundException;
import com.example.hrmanagement.feature.company.Company;
import com.example.hrmanagement.feature.company.CompanyRepository;
import com.example.hrmanagement.feature.permission.Permission;
import com.example.hrmanagement.feature.permission.PermissionRepository;
import com.example.hrmanagement.feature.role.Role;
import com.example.hrmanagement.feature.role.RoleRepository;
import com.example.hrmanagement.feature.user.User;
import com.example.hrmanagement.feature.user.User.GenderEnum;
import com.example.hrmanagement.feature.user.UserRepository;

import lombok.RequiredArgsConstructor;

@Component 
@ConditionalOnProperty(
    name = "app.seed.enabled",
    havingValue = "true"
)
@RequiredArgsConstructor 
public class DatabaseSeeder implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(DatabaseSeeder.class);
    private final String DEFAULT_PASSWORD = "123456";

    private final PermissionRepository permissionRepository;
    private final CompanyRepository companyRepository;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional 
    public void run(String... args) throws Exception{
        if(userRepository.count() > 0){
            log.info("Database already seeded - Skipping");
            return;
        }
        log.info("Start seeding data -----");

        List<Permission> permissions = seedPermissions();
        List<Company> companies = seedCompanies();
        List<Role> roles = seedRoles(permissions);
        seedUsers(roles,companies);
        log.info("Seeding successfully");
    }

    private List<Permission> seedPermissions(){
        List<Permission> permissions = List.of(
                // USER module
        createPermission("CREATE_USER", "/api/v1/users", "POST", "USER"),
        createPermission("UPDATE_USER", "/api/v1/users", "PUT", "USER"),
        createPermission("DELETE_USER", "/api/v1/users/{id}", "DELETE", "USER"),
        createPermission("VIEW_USERS", "/api/v1/users", "GET", "USER"),
        createPermission("VIEW_USER", "/api/v1/users/{id}", "GET", "USER"),

        // COMPANY module
        createPermission("CREATE_COMPANY", "/api/v1/companies", "POST", "COMPANY"),
        createPermission("UPDATE_COMPANY", "/api/v1/companies", "PUT", "COMPANY"),
        createPermission("DELETE_COMPANY", "/api/v1/companies/{id}", "DELETE", "COMPANY"),
        createPermission("VIEW_COMPANIES", "/api/v1/companies", "GET", "COMPANY"),
        createPermission("VIEW_COMPANY", "/api/v1/companies/{id}", "GET", "COMPANY"),

        // ROLE module
        createPermission("CREATE_ROLE", "/api/v1/roles", "POST", "ROLE"),
        createPermission("UPDATE_ROLE", "/api/v1/roles", "PUT", "ROLE"),
        createPermission("DELETE_ROLE", "/api/v1/roles/{id}", "DELETE", "ROLE"),
        createPermission("VIEW_ROLES", "/api/v1/roles", "GET", "ROLE"),
        createPermission("VIEW_ROLE", "/api/v1/roles/{id}", "GET", "ROLE"),

        // PERMISSION module
        createPermission("CREATE_PERMISSION", "/api/v1/permissions", "POST", "PERMISSION"),
        createPermission("UPDATE_PERMISSION", "/api/v1/permissions", "PUT", "PERMISSION"),
        createPermission("DELETE_PERMISSION", "/api/v1/permissions/{id}", "DELETE", "PERMISSION"),
        createPermission("VIEW_PERMISSIONS", "/api/v1/permissions", "GET", "PERMISSION"),
        createPermission("VIEW_PERMISSION", "/api/v1/permissions/{id}", "GET", "PERMISSION"),

        // FILE module
        createPermission("UPLOAD_FILE", "/api/v1/files", "POST", "FILE"));
        List<Permission> saved = this.permissionRepository.saveAllAndFlush(permissions);
        log.info("Seeded permission : {}", saved.size());
        return saved;
    }
    private Permission createPermission(String name, String apiPath, String method, String module){
        Permission permission = new Permission();
        permission.setName(name);
        permission.setApiPath(apiPath);
        permission.setMethod(method);
        permission.setModule(module);
        return permission;
    }

    private List<Company> seedCompanies(){
        List<Company> companies = List.of(
            createCompany("NNH_Entertainment", "Training talent into profession", "New York"),
            createCompany("NNH_Club", "Football Club with Messi", "London"),
            createCompany("NNH_Diamond", "Manufacture and sell diamond", "HANOI CITY"));
            List<Company> saved = this.companyRepository.saveAllAndFlush(companies);
            log.info("Seeding company",saved.size());
            return saved;
    }
    private Company createCompany(String name, String description, String address){
        Company company = new Company();
        company.setName(name);
        company.setDescription(description);    
        company.setAddress(address);
        return company;
    }
    private List<Role> seedRoles(List<Permission> allPermissions){
    Role admin = createRole("ADMIN","Full access",allPermissions);

    Role user = createRole("USER","Part access",
    filterPermission(allPermissions, "CREATE_USER","UPDATE_USER","VIEW_USERS","VIEW_USER"));

    Role manager = createRole("MANAGER", "Department manager",
            filterPermission(allPermissions,
                    "VIEW_USERS", "VIEW_USER",
                    "VIEW_COMPANIES", "VIEW_COMPANY",
                    "VIEW_ROLES", "VIEW_ROLE"));

    Role hr = createRole("HR", "Human resources management",
            filterPermission(allPermissions,
                    "CREATE_USER", "UPDATE_USER", "VIEW_USERS", "VIEW_USER",
                    "VIEW_COMPANIES", "VIEW_COMPANY",
                    "UPLOAD_FILE"));
    List<Role> saved = this.roleRepository.saveAllAndFlush(List.of(admin,user,hr,manager));
    log.info("Seeding role : {}", saved.size());
    return saved;
    }
    private Role createRole(String name, String description, List<Permission> permissions){
        Role role = new Role();
        role.setName(name);
        role.setDescription(description);
        Set<Permission> permissionSet = new HashSet<>(permissions);
        role.setPermissions(permissionSet);
        return role;
    }
    private List<Permission> filterPermission(List<Permission> allPermissions, String ... name){
        List<String> namePermission = List.of(name);
        return allPermissions.stream().filter(p -> namePermission.contains(p.getName())).toList();
    }

    private List<User> seedUsers(List<Role> allRoles, List<Company> companies){
        String encodedPassword = passwordEncoder.encode(DEFAULT_PASSWORD);

        Role adminRole = filterRoles(allRoles, "ADMIN");
        Role hr = filterRoles(allRoles, "HR");
        Role manager = filterRoles(allRoles, "MANAGER");
        Role user = filterRoles(allRoles, "USER");

        Company NNH_Entertainment =filterCompany(companies, "NNH_Entertainment");
        Company NNH_Club =filterCompany(companies, "NNH_Club");
        Company NNH_Diamond =filterCompany(companies, "NNH_Diamond");

        List<User> userList = List.of(
            createUser("Super Admin", "admin@example.com", encodedPassword,
                    30, GenderEnum.MALE, "Ho Chi Minh City",
                    NNH_Entertainment, List.of(adminRole)),

            createUser("HR Manager", "hr@example.com", encodedPassword,
                    28, GenderEnum.FEMALE, "Ha Noi",
                    NNH_Club, List.of(hr)),

            createUser("Department Manager", "manager@example.com", encodedPassword,
                    35, GenderEnum.MALE, "Da Nang",
                    NNH_Diamond, List.of(manager,hr)),

            createUser("Normal User", "user@example.com", encodedPassword,
                    25, GenderEnum.OTHER, "Ho Chi Minh City",
                    NNH_Diamond, List.of(user,manager)));
        List<User> saved = this.userRepository.saveAllAndFlush(userList);
        log.info("Seeding user : {}", saved.size());
        return saved;
            
    }

   private User createUser(String name, String email, String encodedPassword,
            int age, GenderEnum gender, String address,
            Company company, List<Role> roles) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword(encodedPassword);
        user.setAge(age);
        user.setGender(gender);
        user.setAddress(address);
        user.setCompany(company);
        Set<Role> roleSet = new HashSet<>(roles);
        user.setRoles(roleSet);
        return user;
    }
    private Role filterRoles(List<Role> allRoles, String name){
        return allRoles.stream().filter(r -> r.getName().equals(name))
        .findFirst().orElseThrow(() -> new ResourceNotFoundException("Role", "name", name));
    }
    private Company filterCompany(List<Company> companies, String name){
        return companies.stream().filter(c -> c.getName().equals(name))
        .findFirst().orElseThrow(() -> new ResourceNotFoundException("Company", "name", name));
    }
}
