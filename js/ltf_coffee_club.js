Array.prototype.clone = function() {return this.slice(0);}
Array.prototype.back = function() {return this[this.length - 1];}
var generalcounter = 0;

class Situa {
    constructor(active_unpaired_members, friends) {
        this.curr_solution = [];// array of groups
        this.active_unpaired_members = new Set(active_unpaired_members); // array of member_id
        this.friends = friends;//array of set of member id  [0:[1,2,3], 1:[0,2,3]]
        this.make_friends = function(id1, id2) {
            this.friends[id1].add(id2);
            this.friends[id2].add(id1);
        }
        this.remove_friends = function(id1, id2) {
            this.friends[id1].delete(id2);
            this.friends[id2].delete(id1);
        }
        this.are_friends = function(id1, id2) {
            return this.friends[id1].has(id2)
                && this.friends[id2].has(id1);
        }
    }
}

class Member {
    constructor(id, name, enabled, email, telegram_id, times_per_month) {
        if (isNaN(id))
            throw new Error("Id of a member must be a number");
        if (isNaN(times_per_month))
            throw new Error("times per month of a member must be a number");
        this.id = id;
        this.name = name;
        this.enabled = enabled;
        this.email = email;
        this.telegram_id = telegram_id;
        this.times_per_month = times_per_month;
    }
}

class Group {
    constructor() {
        this.group_members = [];
        this.add_member = function (member) {
            this.group_members.push(member);
        };
        this.remove_member = function (member_to_remove) {
            this.group_members = this.group_members.filter(member => {return member != member_to_remove;});
        };
        this.is_empty = () => this.group_members.length === 0;
        this.size = () => this.group_members.length;
    }
}

class GScript{
    static get_members() {
        //TODO add implementation
        return [
            new Member(0, "name0", true, "info0@email.com", "@1234567890", 1),
            new Member(1, "name1", true, "info1@email.com", "@1234567891", 1),
            new Member(2, "name2", true, "info2@email.com", "@1234567892", 2),
            new Member(3, "name3", true, "info3@email.com", "@1234567893", 1),
            new Member(4, "name3", true, "info3@email.com", "@1234567893", 1),
            new Member(5, "name3", true, "info3@email.com", "@1234567893", 1),
            ];
    }

    static get_friends_matrix(max_id) {
        var matrix = [];
        for(var i = 0; i <= max_id; i++) {
            matrix.push(new Set([i]));
        }
        var friends_list = [[0, 3], [1, 4], [2, 5]]; //FIXME call Google Spreadsheet result
        friends_list.forEach(pair => {
            matrix[pair[0]].add(pair[1]);
            matrix[pair[1]].add(pair[0]);
        });
        console.log(matrix);
        return matrix;
    }
}

function get_possible_matches(group, active_unpaired_members, friends) {
    var possible_matches = new Set(active_unpaired_members);
    group.group_members.forEach(member => {
        friends[member].forEach(friend => {
            possible_matches.delete(friend);
        });
    });
    return Array.from(possible_matches);
}

function make_groups(curr_situa, normal_groups_size) {
    if(curr_situa.active_unpaired_members.size === 0) return;
    if(curr_situa.curr_solution.length === 0 || curr_situa.curr_solution.back().size() >= normal_groups_size) {
        curr_situa.curr_solution.push(new Group());
    }
    var possible_matches = get_possible_matches(curr_situa.curr_solution.back(),
                                                curr_situa.active_unpaired_members,
                                                curr_situa.friends);

    for(var i = 0; i<possible_matches.length; i++) {
        var match = possible_matches[i];
        curr_situa.active_unpaired_members.delete(match);
        curr_situa.curr_solution.back().group_members.forEach(member => {
            curr_situa.make_friends(member, match);
        });
        curr_situa.curr_solution.back().add_member(match);
        console.log(generalcounter + ': ');
        console.log(curr_situa.active_unpaired_members);
        console.log(curr_situa.curr_solution);
        generalcounter++;
        make_groups(curr_situa, normal_groups_size);
        if(curr_situa.active_unpaired_members.size === 0)
            return;
        curr_situa.curr_solution.back().remove_member(match);
        curr_situa.curr_solution.back().group_members.forEach(member => {
            curr_situa.remove_friends(member, match);
        });
        curr_situa.active_unpaired_members.add(match);
    }
    if(curr_situa.curr_solution.back().is_empty())
        curr_situa.curr_solution.pop();
}

function have_coffee_club() {
    var members = GScript.get_members(); // array of Members
    var max_members_id = members.map(member => member.id)
                                .reduce((x, y) => Math.max(x, y));
    var active_members_id = members.filter(member => member.enabled === true)
                                   .map(member => member.id);
    //FIXME add shuffle of active members id, change order
    var friends = GScript.get_friends_matrix(max_members_id);
    var curr_situa = new Situa(active_members_id, friends);
    
    make_groups(curr_situa, 3);
    var groups = curr_situa.curr_solution;
    //console.log(groups);
    console.log(curr_situa.active_unpaired_members.size === 0);
    // write_groups_to_friends_sheet(groups);
    // send_emails_to_groups(groups, active_members);
}

have_coffee_club();


// tests
// test_get_possible_matches();
// test_remove_member();

function test_get_possible_matches() {
    var group = new Group();
    group.add_member(0);
    group.add_member(1);
    var active_unpaired_members = [2, 3, 4];
    var friends = [[2], [3]];
    var possible_matches = get_possible_matches(group, active_unpaired_members, friends);
    console.log(possible_matches.length === 1);
    console.log(possible_matches[0] === 4);
    active_unpaired_members = [2, 3];
    possible_matches = get_possible_matches(group, active_unpaired_members, friends);
    console.log(possible_matches.length === 0);    
    active_unpaired_members = [2, 3, 4 ,5];
    possible_matches = get_possible_matches(group, active_unpaired_members, friends);
    console.log(possible_matches.length === 2);
    console.log(possible_matches[0] === 4);
    console.log(possible_matches[1] === 5);
    
}

function test_remove_member(){
    var group = new Group();
    group.add_member(1);
    console.log(group.group_members.length === 1);
    console.log(group.group_members[0] === 1);
    group.remove_member(1);
    console.log(group.group_members.length === 0);
}