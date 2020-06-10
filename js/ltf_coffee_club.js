Array.prototype.clone = function() {return this.slice(0);}
Array.prototype.back = function() {return this[this.length - 1];}

function join_strings(strings, delimiter){
    var joined = "";
    for(var i = 0; i < strings.length ; i++){
        joined += strings[i];
        if(i < strings.length - 1){
            joined += delimiter;
        }
    }
    return joined;
}

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
    constructor(notified = false) {
        this.group_members = [];
        this.notified = notified;
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
        var members_with_id_sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Members_With_ID");
        var coffee_club_members_raw = members_with_id_sheet.getRange(1, 1, members_with_id_sheet.getLastRow(), members_with_id_sheet.getLastColumn())
        .getValues()
        .filter(function(member){return typeof(member[0]) == "number"});        
        return coffee_club_members_raw.map(raw => new Member(raw[0], raw[2], raw[3] == 'Iscriverti', raw[4], raw[5], raw[6]));
    }

    static get_friends_matrix(max_id) {
        var matrix = [];
        for(var i = 0; i <= max_id; i++) {
            matrix.push(new Set([i]));
        }
        var group_list = this.get_friend_groups();
        group_list.forEach(group => {
            for(var a = 0; a < group.group_members.length; a++){
                for(var b = 0; b < group.group_members.length; b++){
                    matrix[group.group_members[a]].add(group.group_members[b]);
                }
            }
        });
        return matrix;
    }

    static get_friend_groups(){
        var friends_sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Friends");
        var group_rows = friends_sheet.getRange(1, 1, friends_sheet.getLastRow(), friends_sheet.getLastColumn())
                                      .getValues()
                                      .filter(function(row){return typeof(row[2]) == "number"});
        return group_rows.map(row => this.row_to_group(row));        
    }

    static row_to_group(row){
        var group = new Group(row[1] == "YES");
        for(var i = 2; i < row.length && typeof(row[i]) == "number"; i++){
            group.add_member(row[i]);
        }
        return group;
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

function generate_email_body_to_notify_group(members){
    var message = "Ciao " + join_strings(members.map(member => member.name.split(" ")[0]), ", ") + "\n\n" +
                  "Sono Sam di Lead The Future, vi scrivo per il coffee club di questo mese.\n" +
                  "Questo mese sarete in gruppo assieme!\n" +
                  "Vi lascio le mail e gli id Telegram che avete inserito in fase di iscrizione, in modo che possiate contattarvi:\n\n" +
                  "Telegram ids:\n" + join_strings (members.map(member => member.telegram_id), "\n") + "\n\n" +
                  "Emails:\n" + join_strings (members.map(member => member.email), "\n") + "\n\n" +
                  "Fatemi sapere nel caso abbiate problemi, suggerimenti, e soprattutto se avreste piacere di fare il coffee club ogni due settimane invece che ogni mese.\n" +
                  "I feedback sono molto apprezzati, sia positivi sia negativi!\n\n" +
                  "A presto,\n" +
                  "Sam :)\n";
    return message;
}

function send_emails_to_groups() {
    var members = GScript.get_members(); // array of Members
    var friend_groups_to_notify = GScript.get_friend_groups().filter(group => !group.notified);
    friend_groups_to_notify.forEach(group => {
        var group_members = group.group_members.map(member_id => members[member_id]);
        var email_body = generate_email_body_to_notify_group(group_members);
        var to = join_strings(group_members.map(member => member.email), ",");
        //var to = join_strings(['samuele.ceroni@leadthefuture.tech', 'samuele.ceroni@gmail.com'], ",");
        
        MailApp.sendEmail('samuele.ceroni@leadthefuture.tech,' + to, 'Coffee Club - Lead The Future', email_body);
    });
}

function have_coffee_club1() {
    var members = GScript.get_members(); // array of Members
    var max_members_id = members.map(member => member.id)
                                .reduce((x, y) => Math.max(x, y));
    var active_members_id = members.filter(member => member.enabled === true)
                                   .map(member => member.id);
    //FIXME add shuffle of active members id, change order
    var friends = GScript.get_friends_matrix(max_members_id);
    var curr_situa = new Situa(active_members_id, friends);
    
    make_groups(curr_situa, 2);
    var groups = curr_situa.curr_solution;
    if(curr_situa.active_unpaired_members.size === 0){
        debug(groups.map(group => group.group_members));
    } else {
        debug(["Error, can't make groups"]);
    }
}


//////////////////////////////////////////////////////////////////////

function debug(object){
    var debug_sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Debug");
    object.forEach(function(element){debug_sheet.appendRow(element);})  
}

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